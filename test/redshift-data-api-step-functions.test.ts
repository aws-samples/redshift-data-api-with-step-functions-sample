import * as cdk from "aws-cdk-lib";
import { Template } from 'aws-cdk-lib/assertions';
import { RedshiftDataApiStepFunctionsStack } from "../lib/redshift-data-api-step-functions-stack";

test("Snapshot test", () => {
  const app = new cdk.App();
  const stack = new RedshiftDataApiStepFunctionsStack(app, "MyTestStack");
  const template = Template.fromStack(stack);
  expect(template).toMatchSnapshot();
});
