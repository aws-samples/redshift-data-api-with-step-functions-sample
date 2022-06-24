#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { RedshiftDataApiStepFunctionsStack } from "../lib/redshift-data-api-step-functions-stack";

const app = new cdk.App();
new RedshiftDataApiStepFunctionsStack(app, "RedshiftDataApiStepFunctionsStack");
