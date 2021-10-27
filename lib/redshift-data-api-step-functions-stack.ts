import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as redshift from "@aws-cdk/aws-redshift";
import * as sns from "@aws-cdk/aws-sns";
import { DataApiFlow } from "./construct/data-api-flow";
import { DataApiFunctions } from "./construct/data-api-functions";
import { SnsPublish } from "@aws-cdk/aws-stepfunctions-tasks";
import { Stack } from "@aws-cdk/core";

export class RedshiftDataApiStepFunctionsStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const vpc = new ec2.Vpc(this, `Vpc`);

        const redshiftCluster = new redshift.Cluster(this, `RedShiftCluster`, {
            vpc,
            masterUser: {
                masterUsername: "admin",
            },
            defaultDatabaseName: "sample",
            numberOfNodes: 1,
            clusterType: redshift.ClusterType.SINGLE_NODE,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });

        const topic = new sns.Topic(this, `Topic`);

        const functions = new DataApiFunctions(this, `Functions`, {
            redshiftClusterIdentifier: redshiftCluster.clusterName,
            databaseUsername: "admin",
            databaseName: "sample",
        });

        const workflow = new DataApiFlow(this, `Workflow`, {
            functions,
            errorNotifyTopic: topic,
            successNotifyTopic: topic,
            redshiftClusterIdentifier: redshiftCluster.clusterName,
            redshiftClusterArn: this.formatArn({
                service: "redshift",
                resource: `cluster:${redshiftCluster.clusterName}`,
            }),
            databaseUsername: "admin",
            databaseName: "sample",
        });

        new cdk.CfnOutput(this, "StateMachineArn", {
            value: workflow.flowStateMachine.stateMachineArn,
            exportName: "WorkFlowStateMachineArn",
        });
    }
}
