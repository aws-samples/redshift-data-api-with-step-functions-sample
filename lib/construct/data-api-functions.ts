import * as cdk from "@aws-cdk/core";
import * as lambdapy from "@aws-cdk/aws-lambda-python";
import * as lambda from "@aws-cdk/aws-lambda";
import * as iam from "@aws-cdk/aws-iam";

interface DataApiFunctionsProps {
    readonly redshiftClusterIdentifier: string;
    readonly databaseName: string;
    readonly databaseUsername: string;
}

export class DataApiFunctions extends cdk.Construct {
    readonly executeStatementHandler: lambda.IFunction;
    readonly pollingHandler: lambda.IFunction;
    readonly getStatementResult: lambda.IFunction;

    constructor(scope: cdk.Construct, id: string, props: DataApiFunctionsProps) {
        super(scope, id);

        // We must use the same IAM Role for executing and describing a statements.
        // https://docs.aws.amazon.com/redshift/latest/mgmt/data-api.html#data-api-workflow
        const lambdaRole = new iam.Role(this, `DataApiRole`, {
            assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        });

        lambdaRole.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole"),
        );
        lambdaRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "redshift-data:DescribeStatement",
                    "redshift-data:ExecuteStatement",
                    "redshift-data:GetStatementResult",
                    "redshift:GetClusterCredentials",
                ],
                // We cannot specify resources currently.
                // https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonredshiftdataapi.html#amazonredshiftdataapi-resources-for-iam-policies
                resources: ["*"],
            }),
        );

        const environment = {
            CLUSTER_IDENTIFIER: props.redshiftClusterIdentifier,
            DATABASE_NAME: props.databaseName,
            USERNAME: props.databaseUsername,
        };

        this.executeStatementHandler = new lambdapy.PythonFunction(this, "ExecuteStatementHandler", {
            entry: "./lambda/execute_statement",
            role: lambdaRole,
            environment,
        });

        this.pollingHandler = new lambdapy.PythonFunction(this, "PollingHandler", {
            role: lambdaRole,
            entry: "./lambda/polling",
        });

        this.getStatementResult = new lambdapy.PythonFunction(this, "GetStatementResultHandler", {
            entry: "./lambda/get_statement_result",
            role: lambdaRole,
            environment,
        });
    }
}
