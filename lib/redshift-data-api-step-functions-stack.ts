import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as redshift from "@aws-cdk/aws-redshift-alpha";
import * as sns from "aws-cdk-lib/aws-sns";
import { DataApiFlow } from "./construct/data-api-flow";
import { DataApiFunctions } from "./construct/data-api-functions";
import { Construct } from "constructs";

export class RedshiftDataApiStepFunctionsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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
        });

        new cdk.CfnOutput(this, "StateMachineArn", {
            value: workflow.flowStateMachine.stateMachineArn,
            exportName: "WorkFlowStateMachineArn",
        });
    }
}
