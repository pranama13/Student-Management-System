import * as dialogflow from '@google-cloud/dialogflow';

const getDialogflowConfig = () => {
  const projectId = process.env.DIALOGFLOW_PROJECT_ID;
  const languageCode = process.env.DIALOGFLOW_LANGUAGE_CODE || 'en-US';

  const rawCreds =
    process.env.DIALOGFLOW_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    null;

  let credentials = null;
  if (rawCreds) {
    try {
      credentials = JSON.parse(rawCreds);
    } catch (e) {
      // If someone pasted JSON with newlines/quotes incorrectly, fail gracefully.
      credentials = null;
    }
  }

  return { projectId, languageCode, credentials };
};

let sessionsClient = null;
let sessionsClientKey = null;

const getSessionsClient = () => {
  const { projectId, credentials } = getDialogflowConfig();
  const key = JSON.stringify({
    projectId: projectId || null,
    hasCreds: Boolean(credentials)
  });

  if (sessionsClient && sessionsClientKey === key) return sessionsClient;

  // If credentials aren't provided here, the SDK will still try ADC
  // (GOOGLE_APPLICATION_CREDENTIALS, workload identity, etc.)
  sessionsClient = new dialogflow.SessionsClient(
    credentials && projectId ? { credentials, projectId } : undefined
  );
  sessionsClientKey = key;
  return sessionsClient;
};

export const isDialogflowConfigured = () => {
  const { projectId, credentials } = getDialogflowConfig();
  // Either explicit JSON creds + projectId, or rely on ADC with projectId.
  return Boolean(projectId) && (Boolean(credentials) || Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS));
};

export const detectDialogflowIntent = async ({
  text,
  sessionId,
  languageCode: languageOverride
}) => {
  const { projectId, languageCode } = getDialogflowConfig();
  if (!projectId) {
    throw new Error('DIALOGFLOW_PROJECT_ID is not set');
  }

  const client = getSessionsClient();
  const sessionPath = client.projectAgentSessionPath(projectId, sessionId);

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text
      },
      languageCode: languageOverride || languageCode
    }
  };

  const [response] = await client.detectIntent(request);
  const queryResult = response?.queryResult;
  const fulfillmentText = queryResult?.fulfillmentText || '';
  const intentName = queryResult?.intent?.displayName || null;
  const intentDetectionConfidence =
    typeof queryResult?.intentDetectionConfidence === 'number'
      ? queryResult.intentDetectionConfidence
      : null;
  const isFallbackIntent = Boolean(queryResult?.intent?.isFallback);

  return {
    fulfillmentText,
    intentName,
    intentDetectionConfidence,
    isFallbackIntent,
    raw: response
  };
};


