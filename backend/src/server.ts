import "dotenv/config";

import express from "express";
import cors from "cors";

import { graphqlRequest } from "./lib/nhost.js";
import { GoogleGenAI } from "@google/genai";

const app = express();

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});
// ==================================================
// MIDDLEWARE
// ==================================================

app.use(cors());
app.use(express.json());

// ==================================================
// HOME / HEALTH CHECK
// ==================================================

app.get("/", (req, res) => {
  return res.status(200).json({
    message: "AI Agent Workflow Builder API is running 🚀",
  });
});

// ==================================================
// GET ALL WORKFLOWS
// ==================================================

app.get("/api/workflows", async (req, res) => {
  try {
    const data = await graphqlRequest(`
      query GetWorkflows {
        workflows {
          id
          org_id
          name
          description
          status
          created_at
          updated_at
        }
      }
    `);

    const workflows = data?.workflows ?? [];

    return res.status(200).json(workflows);
  } catch (error) {
    console.error("Get workflows error:", error);

    return res.status(500).json({
      message: "Failed to fetch workflows",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});


// ==================================================
// CREATE WORKFLOW
// ==================================================

app.post("/api/workflows", async (req, res) => {
  const {
    orgId,
    name,
    description,
    steps = [],
  } = req.body ?? {};

  if (!orgId || !name) {
    return res.status(400).json({
      message: "orgId and name are required",
    });
  }

  try {
    // --------------------------------------------------
    // 1. CREATE WORKFLOW
    // --------------------------------------------------

    const workflowData = await graphqlRequest(
      `
        mutation CreateWorkflow(
          $orgId: uuid!
          $name: String!
          $description: String
          $status: String!
        ) {
          insert_workflows_one(
            object: {
              org_id: $orgId
              name: $name
              description: $description
              status: $status
            }
          ) {
            id
            org_id
            name
            description
            status
            created_at
            updated_at
          }
        }
      `,
      {
        orgId,
        name,
        description: description || "",
        status: "draft",
      }
    );

    const workflow = workflowData?.insert_workflows_one;

    if (!workflow) {
      throw new Error("Workflow could not be created");
    }

    // --------------------------------------------------
// 2. CREATE WORKFLOW STEPS
// --------------------------------------------------

// Frontend node type -> Database step type
const STEP_TYPE_MAP: Record<string, string> = {
  ai_agent: "llm_call",
  lm_call: "llm_call",

  condition: "conditional_branch",
  conditional_branch: "conditional_branch",

  approval: "approval_gate",
  approval_gate: "approval_gate",

  http_request: "http_request",
  db_write: "db_write",
  notify: "notify",
};
const createdSteps = [];

for (let index = 0; index < steps.length; index++) {
  const step = steps[index];

  // Trigger ko workflow_steps me insert nahi karna.
  // Trigger ke liye baad me workflow_triggers use karenge.
  if (step.type === "trigger") {
    continue;
  }

  const databaseType = STEP_TYPE_MAP[step.type];

  // Unknown/unsupported node ko database me insert mat karo.
  if (!databaseType) {
    console.warn(
      `Skipping unsupported workflow step type: ${step.type}`
    );
    continue;
  }

  const stepData = await graphqlRequest(
    `
      mutation CreateWorkflowStep(
        $workflowId: uuid!
        $position: Int!
        $type: String!
        $name: String!
        $config: jsonb
      ) {
        insert_workflow_steps_one(
          object: {
            workflow_id: $workflowId
            position: $position
            type: $type
            name: $name
            config: $config
          }
        ) {
          id
          workflow_id
          position
          type
          name
          config
          created_at
        }
      }
    `,
    {
      workflowId: workflow.id,
      position: index + 1,
      type: databaseType,
      name: step.name,
      config: step.config || {},
    }
  );

  const createdStep =
    stepData?.insert_workflow_steps_one;

  if (createdStep) {
    createdSteps.push(createdStep);
  }
}

    // --------------------------------------------------
    // 3. RESPONSE
    // --------------------------------------------------

    return res.status(201).json({
      message: "Workflow created successfully 🚀",
      workflow,
      steps: createdSteps,
    });
  } catch (error) {
    console.error("Create workflow error:", error);

    return res.status(500).json({
      message: "Failed to create workflow",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
});
// ==================================================
// GET SINGLE WORKFLOW
// ==================================================

app.get("/api/workflows/:workflowId", async (req, res) => {
  const { workflowId } = req.params;

  try {
    const data = await graphqlRequest(
      `
        query GetWorkflow($id: uuid!) {
          workflows_by_pk(id: $id) {
            id
            org_id
            name
            description
            status
            created_at
            updated_at
          }
        }
      `,
      {
        id: workflowId,
      }
    );

    const workflow = data?.workflows_by_pk;

    if (!workflow) {
      return res.status(404).json({
        message: "Workflow not found",
        workflowId,
      });
    }

    return res.status(200).json(workflow);
  } catch (error) {
    console.error("Get workflow error:", error);

    return res.status(500).json({
      message: "Failed to fetch workflow",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// ==================================================
// RUN WORKFLOW
// ==================================================

app.post("/api/workflows/:workflowId/run", async (req, res) => {
  const { workflowId } = req.params;

  // Input jo Postman se bhej sakte ho
  const workflowInput = req.body ?? {};

  let workflowRunId: string | null = null;

  try {
    // ==================================================
    // 1. GET WORKFLOW
    // ==================================================

    const workflowData = await graphqlRequest(
      `
        query GetWorkflow($id: uuid!) {
          workflows_by_pk(id: $id) {
            id
            org_id
            name
            description
            status
            created_at
            updated_at
          }
        }
      `,
      {
        id: workflowId,
      }
    );

    const workflow = workflowData?.workflows_by_pk;

    if (!workflow) {
      return res.status(404).json({
        message: "Workflow not found",
        workflowId,
      });
    }

    console.log("Workflow found:", workflow.name);

    // ==================================================
    // 2. GET WORKFLOW STEPS
    // ==================================================

    const stepsData = await graphqlRequest(
      `
        query GetWorkflowSteps($workflowId: uuid!) {
          workflow_steps(
            where: { workflow_id: { _eq: $workflowId } }
            order_by: { position: asc }
          ) {
            id
            workflow_id
            position
            type
            name
            config
            created_at
          }
        }
      `,
      {
        workflowId,
      }
    );

    const steps = stepsData?.workflow_steps ?? [];

    if (steps.length === 0) {
      return res.status(400).json({
        message: "Workflow has no steps",
        workflowId,
      });
    }

    console.log(`Found ${steps.length} workflow step(s)`);

    // ==================================================
    // 3. CREATE WORKFLOW RUN
    // ==================================================

    const runData = await graphqlRequest(
      `
        mutation CreateWorkflowRun(
          $workflowId: uuid!
          $status: String!
        ) {
          insert_workflow_runs_one(
            object: {
              workflow_id: $workflowId
              status: $status,
              started_at: "now()"
            }
          ) {
            id
            workflow_id
            status
            started_at
            completed_at
            error
            created_at
          }
        }
      `,
      {
        workflowId,
        status: "running",
      }
    );

    const workflowRun = runData?.insert_workflow_runs_one;

    if (!workflowRun) {
      throw new Error("Workflow run could not be created");
    }

    workflowRunId = workflowRun.id;

    console.log("Workflow run created:", workflowRunId);

    // ==================================================
    // 4. EXECUTE EACH STEP
    // ==================================================

    const stepResults = [];

    // Stores the output of the previous step so later steps can use it.
    let previousOutput: Record<string, unknown> | null = null;

    for (const step of steps) {
      console.log(
        `Executing step ${step.position}: ${step.name} (${step.type})`
      );

      // ==================================================
      // 4A. CREATE STEP RUN
      // ==================================================

      const stepRunData = await graphqlRequest(
        `
          mutation CreateStepRun(
            $workflowRunId: uuid!
            $workflowStepId: uuid!
            $status: String!
            $input: jsonb
          ) {
            insert_step_runs_one(
              object: {
                workflow_run_id: $workflowRunId
                workflow_step_id: $workflowStepId
                status: $status
                input: $input
                attempt_count: 1
                started_at: "now()"
              }
            ) {
              id
              workflow_run_id
              workflow_step_id
              status
              input
              output
              error
              attempt_count
              started_at
              completed_at
              created_at
            }
          }
        `,
        {
          workflowRunId,
          workflowStepId: step.id,
          status: "running",
          input: workflowInput,
        }
      );

      const stepRun = stepRunData?.insert_step_runs_one;

      if (!stepRun) {
        throw new Error(
          `Step run could not be created for step ${step.name}`
        );
      }

      async function executeHttpRequest(
  config: any,
  workflowInput: any,
  previousOutput: any
) {
  if (!config?.url) {
    throw new Error("HTTP Request step requires a URL");
  }

  const method = String(config.method || "GET").toUpperCase();

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(config.headers || {}),
  };

  let body: string | undefined;

  if (method !== "GET" && method !== "HEAD") {
    const requestBody = config.body ?? {
      workflowInput,
      previousOutput,
    };

    body =
      typeof requestBody === "string"
        ? requestBody
        : JSON.stringify(requestBody);

    headers["Content-Type"] =
      headers["Content-Type"] || "application/json";
  }

  console.log("HTTP Request:", {
    method,
    url: config.url,
  });

  const response = await fetch(config.url, {
    method,
    headers,
    body,
  });

  const rawResponse = await response.text();

  let responseData: any;

  try {
    responseData = rawResponse
      ? JSON.parse(rawResponse)
      : null;
  } catch {
    responseData = rawResponse;
  }

  if (!response.ok) {
    throw new Error(
      `HTTP request failed: ${response.status} ${response.statusText}`
    );
  }

  return {
    type: "http_response",
    status: response.status,
    statusText: response.statusText,
    url: config.url,
    method,
    data: responseData,
    executedAt: new Date().toISOString(),
  };
}

    // ==================================================
// 4B. STEP EXECUTION
// ==================================================

let output: Record<string, unknown>;

if (step.type === "llm_call") {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured"
    );
  }

  const systemPrompt =
    step.config?.systemPrompt ||
    step.config?.prompt ||
    "You are a helpful AI assistant.";

  const userInput =
    step.config?.userInput &&
    typeof step.config.userInput === "string"
      ? step.config.userInput
          .replace(
            "{{trigger.message}}",
            String(workflowInput?.message || "")
          )
          .replace(
            "{{user}}",
            String(workflowInput?.user || "")
          )
      : String(
          workflowInput?.message || ""
        );

  const model =
  step.config?.model || "gemini-2.5-flash";

  console.log("🤖 Calling Gemini:", {
    model,
  });

  const response = await gemini.models.generateContent({
    model,
    contents: userInput,
    config: {
      systemInstruction: String(systemPrompt),
    },
  });

  const message = response.text || "";

  output = {
    type: "llm_response",
    message,
    model,
    input: workflowInput,
    executedAt: new Date().toISOString(),
  };
}

else if (step.type === "http_request") {

  output = await executeHttpRequest(
    step.config || {},
    workflowInput,
    previousOutput
  );

} else if (step.type === "conditional_branch") {

  const condition = step.config || {};
  const source = previousOutput as any;

  // Supports nested fields such as data.id or data.title.
  const getNestedValue = (obj: any, path: string) => {
    if (!obj || !path) return undefined;

    return path.split(".").reduce((current, key) => {
      if (current === null || current === undefined) return undefined;
      return current[key];
    }, obj);
  };

  const actualValue = getNestedValue(source, condition.field);

  let conditionResult = false;

  switch (condition.operator) {
    case "equals":
      conditionResult =
        String(actualValue) === String(condition.value);
      break;

    case "not_equals":
      conditionResult =
        String(actualValue) !== String(condition.value);
      break;

    case "contains":
      conditionResult = String(actualValue ?? "")
        .toLowerCase()
        .includes(String(condition.value ?? "").toLowerCase());
      break;

    case "exists":
      conditionResult =
        actualValue !== undefined && actualValue !== null;
      break;

    case "greater_than":
      conditionResult =
        Number(actualValue) > Number(condition.value);
      break;

    case "less_than":
      conditionResult =
        Number(actualValue) < Number(condition.value);
      break;

    default:
      throw new Error(
        `Unsupported conditional operator: ${condition.operator}`
      );
  }

  output = {
    type: "conditional_branch",
    condition: {
      field: condition.field,
      operator: condition.operator,
      value: condition.value,
    },
    actualValue,
    result: conditionResult,
    branch: conditionResult ? "true" : "false",
    nextPosition: conditionResult
      ? condition.true_next_position ?? null
      : condition.false_next_position ?? null,
    message: conditionResult
      ? "Condition matched. Taking TRUE branch."
      : "Condition did not match. Taking FALSE branch.",
    executedAt: new Date().toISOString(),
  };

} else if (step.type === "approval_gate") {

  console.log("⏸ Approval gate reached. Pausing workflow...");

  const pauseOutput = {
    type: "approval_required",
    message:
      step.config?.message ||
      "Approval is required before this workflow can continue.",
    status: "paused",
    stepId: step.id,
    stepName: step.name,
    requestedAt: new Date().toISOString(),
  };

  const pausedStepData = await graphqlRequest(
    `
      mutation PauseStepRun(
        $id: uuid!
        $status: String!
        $output: jsonb
      ) {
        update_step_runs_by_pk(
          pk_columns: { id: $id }
          _set: {
            status: $status
            output: $output
          }
        ) {
          id
          workflow_run_id
          workflow_step_id
          status
          input
          output
          error
          attempt_count
          started_at
          completed_at
          created_at
        }
      }
    `,
    {
      id: stepRun.id,
      status: "paused",
      output: pauseOutput,
    }
  );

  const pausedStepRun = pausedStepData?.update_step_runs_by_pk;

  const pausedWorkflowData = await graphqlRequest(
    `
      mutation PauseWorkflowRun(
        $id: uuid!
        $status: String!
      ) {
        update_workflow_runs_by_pk(
          pk_columns: { id: $id }
          _set: {
            status: $status
          }
        ) {
          id
          workflow_id
          status
          started_at
          completed_at
          error
          created_at
        }
      }
    `,
    {
      id: workflowRunId,
      status: "paused",
    }
  );

  const pausedWorkflowRun =
    pausedWorkflowData?.update_workflow_runs_by_pk;

  stepResults.push({
    step: {
      id: step.id,
      position: step.position,
      type: step.type,
      name: step.name,
    },
    run: pausedStepRun,
  });

  return res.status(200).json({
    message: "Workflow paused — approval required ⏸️",
    workflow: {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
    },
    run: pausedWorkflowRun,
    steps: stepResults,
  });

} else {

   output = {
    message: `Step "${step.name}" executed successfully.`,
    input: workflowInput,
    executedAt: new Date().toISOString(),
  };
}
      console.log("Step output:", output);

      // ==================================================
      // 4C. UPDATE STEP RUN → COMPLETED
      // ==================================================

      const completedStepData = await graphqlRequest(
        `
          mutation CompleteStepRun(
            $id: uuid!
            $status: String!
            $output: jsonb
          ) {
            update_step_runs_by_pk(
              pk_columns: { id: $id }
              _set: {
                status: $status
                output: $output
                completed_at: "now()"
              }
            ) {
              id
              workflow_run_id
              workflow_step_id
              status
              input
              output
              error
              attempt_count
              started_at
              completed_at
              created_at
            }
          }
        `,
        {
          id: stepRun.id,
          status: "completed",
          output,
        }
      );

      const completedStep =
        completedStepData?.update_step_runs_by_pk;

      // Make this step's output available to the next step.
      previousOutput = output;

      stepResults.push({
        step: {
          id: step.id,
          position: step.position,
          type: step.type,
          name: step.name,
        },
        run: completedStep,
      });
    }

    // ==================================================
    // 5. UPDATE WORKFLOW RUN → COMPLETED
    // ==================================================

    const completedRunData = await graphqlRequest(
      `
        mutation CompleteWorkflowRun(
          $id: uuid!
          $status: String!
        ) {
          update_workflow_runs_by_pk(
            pk_columns: { id: $id }
            _set: {
              status: $status
              completed_at: "now()"
            }
          ) {
            id
            workflow_id
            status
            started_at
            completed_at
            error
            created_at
          }
        }
      `,
      {
        id: workflowRunId,
        status: "completed",
      }
    );

    const completedWorkflowRun =
      completedRunData?.update_workflow_runs_by_pk;

    // ==================================================
    // 6. SUCCESS RESPONSE
    // ==================================================

    return res.status(200).json({
      message: "Workflow completed successfully 🚀",

      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
      },

      run: completedWorkflowRun,

      steps: stepResults,
    });
  } catch (error) {
    // ==================================================
    // WORKFLOW FAILED
    // ==================================================

    console.error("Workflow run error:", error);

    const errorMessage =
      error instanceof Error ? error.message : String(error);

    // --------------------------------------------------
    // If workflow run was already created,
    // mark it as failed
    // --------------------------------------------------

    if (workflowRunId) {
      try {
        await graphqlRequest(
          `
            mutation FailWorkflowRun(
              $id: uuid!
              $status: String!
              $error: String!
            ) {
              update_workflow_runs_by_pk(
                pk_columns: { id: $id }
                _set: {
                  status: $status
                  error: $error
                  completed_at: "now()"
                }
              ) {
                id
                status
                error
                completed_at
              }
            }
          `,
          {
            id: workflowRunId,
            status: "failed",
            error: errorMessage,
          }
        );
      } catch (updateError) {
        console.error(
          "Could not mark workflow run as failed:",
          updateError
        );
      }
    }

    return res.status(500).json({
      message: "Failed to run workflow",
      error: errorMessage,
      workflowRunId,
    });
  }
});

// ==================================================
// GET WORKFLOW RUNS
// ==================================================

app.get("/api/workflows/:workflowId/runs", async (req, res) => {
  const { workflowId } = req.params;

  try {
    const data = await graphqlRequest(
      `
        query GetWorkflowRuns($workflowId: uuid!) {
          workflow_runs(
            where: { workflow_id: { _eq: $workflowId } }
            order_by: { created_at: desc }
          ) {
            id
            workflow_id
            status
            started_at
            completed_at
            error
            created_at
          }
        }
      `,
      {
        workflowId,
      }
    );

    return res.status(200).json({
      workflowId,
      runs: data?.workflow_runs ?? [],
    });
  } catch (error) {
    console.error("Get workflow runs error:", error);

    return res.status(500).json({
      message: "Failed to fetch workflow runs",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// ==================================================
// GET SINGLE WORKFLOW RUN WITH STEP RUNS
// ==================================================

app.get("/api/workflow-runs/:runId", async (req, res) => {
  const { runId } = req.params;

  try {
    const data = await graphqlRequest(
      `
        query GetWorkflowRun($id: uuid!) {
          workflow_runs_by_pk(id: $id) {
            id
            workflow_id
            status
            started_at
            completed_at
            error
            created_at

            step_runs(
              order_by: { created_at: asc }
            ) {
              id
              workflow_run_id
              workflow_step_id
              status
              input
              output
              error
              attempt_count
              started_at
              completed_at
              created_at
            }
          }
        }
      `,
      {
        id: runId,
      }
    );

    const run = data?.workflow_runs_by_pk;

    if (!run) {
      return res.status(404).json({
        message: "Workflow run not found",
        runId,
      });
    }

    return res.status(200).json(run);
  } catch (error) {
    console.error("Get workflow run error:", error);

    return res.status(500).json({
      message: "Failed to fetch workflow run",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});


// ==================================================
// APPROVE STEP / RESUME WORKFLOW
// ==================================================
//
// Body:
// {
//   "stepRunId": "<paused step_run id>",
//   "userId": "<approver user id>"
// }
//
// Only organization owners/editors can approve.
// The paused approval step is marked completed and the
// workflow continues with any remaining steps.
// ==================================================

app.post("/api/workflows/approve-step", async (req, res) => {
  const { stepRunId, userId } = req.body ?? {};

  if (!stepRunId || !userId) {
    return res.status(400).json({
      message: "stepRunId and userId are required",
    });
  }

  try {
    // --------------------------------------------------
    // 1. GET STEP RUN
    // --------------------------------------------------
    const stepRunData = await graphqlRequest(
      `
        query GetStepRun($id: uuid!) {
          step_runs_by_pk(id: $id) {
            id
            workflow_run_id
            workflow_step_id
            status
            input
            output
            error
            attempt_count
            started_at
            completed_at
            created_at
          }
        }
      `,
      { id: stepRunId }
    );

    const stepRun = stepRunData?.step_runs_by_pk;

    if (!stepRun) {
      return res.status(404).json({
        message: "Step run not found",
        stepRunId,
      });
    }

    if (stepRun.status !== "paused") {
      return res.status(400).json({
        message: "This step is not waiting for approval",
        status: stepRun.status,
      });
    }

    // --------------------------------------------------
    // 2. GET WORKFLOW STEP
    // --------------------------------------------------
    const stepData = await graphqlRequest(
      `
        query GetWorkflowStep($id: uuid!) {
          workflow_steps_by_pk(id: $id) {
            id
            workflow_id
            position
            type
            name
            config
            created_at
          }
        }
      `,
      { id: stepRun.workflow_step_id }
    );

    const approvalStep = stepData?.workflow_steps_by_pk;

    if (!approvalStep) {
      return res.status(404).json({
        message: "Workflow step not found",
      });
    }

    if (approvalStep.type !== "approval_gate") {
      return res.status(400).json({
        message: "The supplied step is not an approval gate",
        type: approvalStep.type,
      });
    }

    // --------------------------------------------------
    // 3. GET WORKFLOW RUN
    // --------------------------------------------------
    const workflowRunData = await graphqlRequest(
      `
        query GetWorkflowRunForApproval($id: uuid!) {
          workflow_runs_by_pk(id: $id) {
            id
            workflow_id
            status
            started_at
            completed_at
            error
            created_at
          }
        }
      `,
      { id: stepRun.workflow_run_id }
    );

    const workflowRun = workflowRunData?.workflow_runs_by_pk;

    if (!workflowRun) {
      return res.status(404).json({
        message: "Workflow run not found",
        runId: stepRun.workflow_run_id,
      });
    }

    if (workflowRun.status !== "paused") {
      return res.status(400).json({
        message: "Workflow is not paused",
        status: workflowRun.status,
      });
    }

    // --------------------------------------------------
    // 4. GET WORKFLOW
    // --------------------------------------------------
    const workflowData = await graphqlRequest(
      `
        query GetWorkflowForApproval($id: uuid!) {
          workflows_by_pk(id: $id) {
            id
            org_id
            name
            description
            status
          }
        }
      `,
      { id: workflowRun.workflow_id }
    );

    const workflow = workflowData?.workflows_by_pk;

    if (!workflow) {
      return res.status(404).json({
        message: "Workflow not found",
        workflowId: workflowRun.workflow_id,
      });
    }

    // --------------------------------------------------
    // 5. CHECK APPROVER ROLE
    // --------------------------------------------------
    const memberData = await graphqlRequest(
      `
        query GetOrgMemberRole(
          $orgId: uuid!
          $userId: uuid!
        ) {
          org_members(
            where: {
              org_id: { _eq: $orgId }
              user_id: { _eq: $userId }
            }
            limit: 1
          ) {
            id
            org_id
            user_id
            role
          }
        }
      `,
      {
        orgId: workflow.org_id,
        userId,
      }
    );

    const member = memberData?.org_members?.[0];

    if (!member) {
      return res.status(403).json({
        message: "User is not a member of this organization",
      });
    }

    const role = String(member.role || "").toLowerCase();

    if (role !== "owner" && role !== "editor") {
      return res.status(403).json({
        message: "Only owner or editor can approve this workflow",
        role: member.role,
      });
    }

    console.log(
      `Approval granted by ${userId} (${member.role}) for step ${stepRunId}`
    );

    // --------------------------------------------------
    // 6. MARK APPROVAL STEP AS COMPLETED
    // --------------------------------------------------
    const approvalOutput = {
      type: "approval_granted",
      message: "Workflow approval granted.",
      status: "approved",
      approvedBy: userId,
      approvedAt: new Date().toISOString(),
      stepId: approvalStep.id,
      stepName: approvalStep.name,
    };

    const approvedStepData = await graphqlRequest(
      `
        mutation ApproveStepRun(
          $id: uuid!
          $status: String!
          $output: jsonb
          $approvedBy: uuid!
        ) {
          update_step_runs_by_pk(
            pk_columns: { id: $id }
            _set: {
              status: $status
              output: $output
              approved_by: $approvedBy
              approved_at: "now()"
              completed_at: "now()"
            }
          ) {
            id
            workflow_run_id
            workflow_step_id
            status
            input
            output
            error
            attempt_count
            approved_by
            approved_at
            started_at
            completed_at
            created_at
          }
        }
      `,
      {
        id: stepRunId,
        status: "completed",
        output: approvalOutput,
        approvedBy: userId,
      }
    );

    const approvedStepRun =
      approvedStepData?.update_step_runs_by_pk;

    // --------------------------------------------------
    // 7. GET ALL WORKFLOW STEPS
    // --------------------------------------------------
    const stepsData = await graphqlRequest(
      `
        query GetRemainingWorkflowSteps($workflowId: uuid!) {
          workflow_steps(
            where: { workflow_id: { _eq: $workflowId } }
            order_by: { position: asc }
          ) {
            id
            workflow_id
            position
            type
            name
            config
            created_at
          }
        }
      `,
      { workflowId: workflow.id }
    );

    const steps = stepsData?.workflow_steps ?? [];

    // --------------------------------------------------
    // 8. GET EXISTING STEP RUNS
    // --------------------------------------------------
    const existingRunsData = await graphqlRequest(
      `
        query GetExistingStepRuns($workflowRunId: uuid!) {
          step_runs(
            where: { workflow_run_id: { _eq: $workflowRunId } }
            order_by: { created_at: asc }
          ) {
            id
            workflow_run_id
            workflow_step_id
            status
            input
            output
            error
            attempt_count
            approved_by
            approved_at
            started_at
            completed_at
            created_at
          }
        }
      `,
      { workflowRunId: workflowRun.id }
    );

    const existingStepRuns =
      existingRunsData?.step_runs ?? [];

    const previousCompletedRun = [...existingStepRuns]
      .filter(
        (run: any) =>
          run.status === "completed" &&
          run.id !== stepRun.id
      )
      .sort(
        (a: any, b: any) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )[0];

    let previousOutput =
      previousCompletedRun?.output ?? null;

    const workflowInput =
      stepRun.input ??
      previousCompletedRun?.input ??
      {};

    const remainingSteps = steps.filter(
      (step: any) =>
        Number(step.position) >
        Number(approvalStep.position)
    );

    const resumedStepResults: any[] = [
      {
        step: {
          id: approvalStep.id,
          position: approvalStep.position,
          type: approvalStep.type,
          name: approvalStep.name,
        },
        run: approvedStepRun,
      },
    ];

    // --------------------------------------------------
    // 9. EXECUTE REMAINING STEPS
    // --------------------------------------------------
    for (const step of remainingSteps) {
      console.log(
        `Resuming step ${step.position}: ${step.name} (${step.type})`
      );

      const newStepRunData = await graphqlRequest(
        `
          mutation CreateResumeStepRun(
            $workflowRunId: uuid!
            $workflowStepId: uuid!
            $status: String!
            $input: jsonb
          ) {
            insert_step_runs_one(
              object: {
                workflow_run_id: $workflowRunId
                workflow_step_id: $workflowStepId
                status: $status
                input: $input
                attempt_count: 1
                started_at: "now()"
              }
            ) {
              id
              workflow_run_id
              workflow_step_id
              status
              input
              output
              error
              attempt_count
              started_at
              completed_at
              created_at
            }
          }
        `,
        {
          workflowRunId: workflowRun.id,
          workflowStepId: step.id,
          status: "running",
          input: workflowInput,
        }
      );

      const newStepRun =
        newStepRunData?.insert_step_runs_one;

      if (!newStepRun) {
        throw new Error(
          `Could not create resumed step run for ${step.name}`
        );
      }

      let output: Record<string, unknown>;
if (step.type === "llm_call") {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not configured"
    );
  }

  const systemPrompt =
    step.config?.systemPrompt ||
    step.config?.prompt ||
    "You are a helpful AI assistant.";

  const userInput =
    step.config?.userInput &&
    typeof step.config.userInput === "string"
      ? step.config.userInput
          .replace(
            "{{trigger.message}}",
            String(workflowInput?.message || "")
          )
          .replace(
            "{{user}}",
            String(workflowInput?.user || "")
          )
      : String(
          workflowInput?.message || ""
        );

  const model =
  step.config?.model || "gemini-2.5-flash";

  console.log("🤖 Calling Gemini after approval:", {
    model,
  });

  const response =
    await gemini.models.generateContent({
      model,
      contents: userInput,
      config: {
        systemInstruction: String(systemPrompt),
      },
    });

  const message =
    response.text || "";

  output = {
    type: "llm_response",
    message,
    model,
    input: workflowInput,
    executedAt: new Date().toISOString(),
  };
}

else if (step.type === "http_request") {
        if (!step.config?.url) {
          throw new Error(
            `HTTP Request step "${step.name}" requires a URL`
          );
        }

        const method = String(
          step.config.method || "GET"
        ).toUpperCase();

        const headers: Record<string, string> = {
          Accept: "application/json",
          ...(step.config.headers || {}),
        };

        let body: string | undefined;

        if (method !== "GET" && method !== "HEAD") {
          const requestBody = step.config.body ?? {
            workflowInput,
            previousOutput,
          };

          body =
            typeof requestBody === "string"
              ? requestBody
              : JSON.stringify(requestBody);

          headers["Content-Type"] =
            headers["Content-Type"] ||
            "application/json";
        }

        const response = await fetch(
          step.config.url,
          {
            method,
            headers,
            body,
          }
        );

        const rawResponse = await response.text();

        let responseData: any;

        try {
          responseData = rawResponse
            ? JSON.parse(rawResponse)
            : null;
        } catch {
          responseData = rawResponse;
        }

        if (!response.ok) {
          throw new Error(
            `HTTP request failed: ${response.status} ${response.statusText}`
          );
        }

        output = {
          type: "http_response",
          status: response.status,
          statusText: response.statusText,
          url: step.config.url,
          method,
          data: responseData,
          executedAt: new Date().toISOString(),
        };
      } else if (
        step.type === "conditional_branch"
      ) {
        const condition = step.config || {};
        const source = previousOutput as any;

        const getNestedValue = (
          obj: any,
          path: string
        ) => {
          if (!obj || !path) return undefined;

          return path
            .split(".")
            .reduce((current, key) => {
              if (
                current === null ||
                current === undefined
              ) {
                return undefined;
              }

              return current[key];
            }, obj);
        };

        const actualValue = getNestedValue(
          source,
          condition.field
        );

        let conditionResult = false;

        switch (condition.operator) {
          case "equals":
            conditionResult =
              String(actualValue) ===
              String(condition.value);
            break;

          case "not_equals":
            conditionResult =
              String(actualValue) !==
              String(condition.value);
            break;

          case "contains":
            conditionResult = String(
              actualValue ?? ""
            )
              .toLowerCase()
              .includes(
                String(condition.value ?? "")
                  .toLowerCase()
              );
            break;

          case "exists":
            conditionResult =
              actualValue !== undefined &&
              actualValue !== null;
            break;

          case "greater_than":
            conditionResult =
              Number(actualValue) >
              Number(condition.value);
            break;

          case "less_than":
            conditionResult =
              Number(actualValue) <
              Number(condition.value);
            break;

          default:
            throw new Error(
              `Unsupported conditional operator: ${condition.operator}`
            );
        }

        output = {
          type: "conditional_branch",
          condition: {
            field: condition.field,
            operator: condition.operator,
            value: condition.value,
          },
          actualValue,
          result: conditionResult,
          branch: conditionResult
            ? "true"
            : "false",
          nextPosition: conditionResult
            ? condition.true_next_position ?? null
            : condition.false_next_position ?? null,
          message: conditionResult
            ? "Condition matched. Taking TRUE branch."
            : "Condition did not match. Taking FALSE branch.",
          executedAt: new Date().toISOString(),
        };
      } else if (
        step.type === "approval_gate"
      ) {
        const pauseOutput = {
          type: "approval_required",
          message:
            step.config?.message ||
            "Approval is required before this workflow can continue.",
          status: "paused",
          stepId: step.id,
          stepName: step.name,
          requestedAt: new Date().toISOString(),
        };

        const pausedStepData =
          await graphqlRequest(
            `
              mutation PauseResumeStepRun(
                $id: uuid!
                $status: String!
                $output: jsonb
              ) {
                update_step_runs_by_pk(
                  pk_columns: { id: $id }
                  _set: {
                    status: $status
                    output: $output
                  }
                ) {
                  id
                  workflow_run_id
                  workflow_step_id
                  status
                  input
                  output
                  error
                  attempt_count
                  started_at
                  completed_at
                  created_at
                }
              }
            `,
            {
              id: newStepRun.id,
              status: "paused",
              output: pauseOutput,
            }
          );

        await graphqlRequest(
          `
            mutation PauseResumedWorkflow(
              $id: uuid!
              $status: String!
            ) {
              update_workflow_runs_by_pk(
                pk_columns: { id: $id }
                _set: { status: $status }
              ) {
                id
                workflow_id
                status
                started_at
                completed_at
                error
                created_at
              }
            }
          `,
          {
            id: workflowRun.id,
            status: "paused",
          }
        );

        return res.status(200).json({
          message:
            "Workflow resumed and paused again for approval ⏸️",
          workflow: {
            id: workflow.id,
            name: workflow.name,
            description: workflow.description,
            status: workflow.status,
          },
          run: {
            ...workflowRun,
            status: "paused",
          },
          steps: [
            ...resumedStepResults,
            {
              step: {
                id: step.id,
                position: step.position,
                type: step.type,
                name: step.name,
              },
              run:
                pausedStepData?.update_step_runs_by_pk,
            },
          ],
        });
      } else {
        output = {
          message: `Step "${step.name}" executed successfully.`,
          input: workflowInput,
          executedAt: new Date().toISOString(),
        };
      }

      const completedStepData =
        await graphqlRequest(
          `
            mutation CompleteResumedStepRun(
              $id: uuid!
              $status: String!
              $output: jsonb
            ) {
              update_step_runs_by_pk(
                pk_columns: { id: $id }
                _set: {
                  status: $status
                  output: $output
                  completed_at: "now()"
                }
              ) {
                id
                workflow_run_id
                workflow_step_id
                status
                input
                output
                error
                attempt_count
                started_at
                completed_at
                created_at
              }
            }
          `,
          {
            id: newStepRun.id,
            status: "completed",
            output,
          }
        );

      const completedStep =
        completedStepData?.update_step_runs_by_pk;

      previousOutput = output;

      resumedStepResults.push({
        step: {
          id: step.id,
          position: step.position,
          type: step.type,
          name: step.name,
        },
        run: completedStep,
      });
    }

    // --------------------------------------------------
    // 10. WORKFLOW COMPLETED
    // --------------------------------------------------
    const completedRunData =
      await graphqlRequest(
        `
          mutation CompleteApprovedWorkflow(
            $id: uuid!
            $status: String!
          ) {
            update_workflow_runs_by_pk(
              pk_columns: { id: $id }
              _set: {
                status: $status
                completed_at: "now()"
              }
            ) {
              id
              workflow_id
              status
              started_at
              completed_at
              error
              created_at
            }
          }
        `,
        {
          id: workflowRun.id,
          status: "completed",
        }
      );

    const completedRun =
      completedRunData?.update_workflow_runs_by_pk;

    return res.status(200).json({
      message:
        "Approval granted and workflow resumed successfully 🚀",
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
      },
      run: completedRun,
      steps: resumedStepResults,
    });
  } catch (error) {
    console.error("Approve/resume workflow error:", error);

    return res.status(500).json({
      message: "Failed to approve/resume workflow",
      error:
        error instanceof Error
          ? error.message
          : String(error),
    });
  }
});

// ==================================================
// 404 ROUTE
// ==================================================

app.use((req, res) => {
  return res.status(404).json({
    message: "Route not found",
    method: req.method,
    path: req.originalUrl,
  });
});

// ==================================================
// GLOBAL ERROR HANDLER
// ==================================================

app.use(
  (
    error: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Global error:", error);

    return res.status(500).json({
      message: "Internal server error",
      error:
        error instanceof Error ? error.message : String(error),
    });
  }
);

// ==================================================
// SERVER
// ==================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on http://localhost:${PORT}`
  );
});