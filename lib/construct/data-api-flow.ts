import * as cdk from "aws-cdk-lib";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import * as sfnt from "aws-cdk-lib/aws-stepfunctions-tasks";
import * as iam from "aws-cdk-lib/aws-iam";
import { DataApiFunctions } from "./data-api-functions";
import { Construct } from "constructs";

interface DataApiFlowProps {
    readonly functions: DataApiFunctions;
    readonly errorNotifyTopic: sns.ITopic;
    readonly successNotifyTopic: sns.ITopic;

    readonly redshiftClusterIdentifier: string;
    readonly redshiftClusterArn: string;
    readonly databaseName: string;
    readonly databaseUsername: string;
}

export class DataApiFlow extends Construct {
    readonly flowStateMachine: sfn.StateMachine;

    constructor(scope: Construct, id: string, props: DataApiFlowProps) {
        super(scope, id);

        const functions = props.functions;

        const errorHandler = new sfnt.SnsPublish(this, `NotifyError`, {
            topic: props.errorNotifyTopic,
            message: sfn.TaskInput.fromJsonPathAt("$"),
            subject: "Executing a statement failed",
            resultPath: "$.Notify",
        });

        const successHandler = new sfnt.SnsPublish(this, `NotifySuccess`, {
            topic: props.successNotifyTopic,
            message: sfn.TaskInput.fromJsonPathAt("$"),
            subject: "Statement successfully proceessed.",
            resultPath: "$.Notify",
        });

        const executeStatement = new sfnt.CallAwsService(this, `ExecuteStatement`, {
            service: "redshiftdata",
            action: "executeStatement",
            resultPath: "$.ExecuteStatement",
            parameters: {
                ClusterIdentifier: props.redshiftClusterIdentifier,
                Database: props.databaseName,
                Sql: "select s.nspname as table_schema, s.oid as schema_id from pg_catalog.pg_namespace s",
                DbUser: props.databaseUsername,
            },
            iamResources: [props.redshiftClusterArn],
            iamAction: "redshift-data:ExecuteStatement",
        }).addCatch(errorHandler, { resultPath: "$.Error" });

        const getStatementResult = new sfnt.LambdaInvoke(this, `GetStatementResult`, {
            lambdaFunction: functions.getStatementResult,
            inputPath: "$.ExecuteStatement",
            resultPath: "$.GetStatementResult",
        })
            .addCatch(errorHandler, { resultPath: "$.Error" })
            .next(successHandler);

        const poller = (id: string, inputPath: string, next: sfn.IChainable, error: sfn.IChainable = errorHandler) => {
            const pollingOutputPath = `$.PollResult${id}`;
            const pollingWaitTime = cdk.Duration.seconds(10);
            const polling = new sfnt.CallAwsService(this, id, {
                service: "redshiftdata",
                action: "describeStatement",
                resultPath: pollingOutputPath,
                parameters: {
                    Id: sfn.TaskInput.fromJsonPathAt(inputPath).value,
                },
                iamResources: ["*"],
                iamAction: "redshift-data:DescribeStatement",
            }).addCatch(errorHandler, { resultPath: "$.Error" });

            const statusPath = `${pollingOutputPath}.Status`;
            const choice = new sfn.Choice(this, `${id}JobComplete?`)
                // Go to next step if the statement is finished
                .when(sfn.Condition.stringEquals(statusPath, "FINISHED"), next)
                // Retry polling if the statement isn't finished nor failed
                .when(
                    sfn.Condition.or(
                        sfn.Condition.stringEquals(statusPath, "STARTED"),
                        sfn.Condition.stringEquals(statusPath, "SUBMITTED"),
                        sfn.Condition.stringEquals(statusPath, "PICKED"),
                    ),
                    new sfn.Wait(this, `${id}Wait`, { time: sfn.WaitTime.duration(pollingWaitTime) }).next(polling),
                )
                // Notify error if the statement is failed
                .otherwise(error);

            polling.next(choice);

            return polling;
        };

        executeStatement.next(poller(`StatementPolling`, "$.ExecuteStatement.Id", getStatementResult));

        this.flowStateMachine = new sfn.StateMachine(this, `FlowStateMachine`, {
            definition: sfn.Chain.start(executeStatement),
        });

        this.flowStateMachine.addToRolePolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                resources: ["*"],
                actions: ["redshift:GetClusterCredentials"],
            }),
        );
    }
}
