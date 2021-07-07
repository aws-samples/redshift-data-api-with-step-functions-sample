import { SynthUtils } from "@aws-cdk/assert";
import * as cdk from "@aws-cdk/core";
import { RedshiftDataApiStepFunctionsStack } from "../lib/redshift-data-api-step-functions-stack";

test("Snapshot test", () => {
    const app = new cdk.App();
    const stack = new RedshiftDataApiStepFunctionsStack(app, "MyTestStack");
    expect(SynthUtils.toCloudFormation(stack)).toMatchSnapshot();
});
