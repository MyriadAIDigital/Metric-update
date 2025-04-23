import { app, InvocationContext, Timer } from "@azure/functions";
import axios from "axios";
import moment = require("moment");


export async function Metric(myTimer: Timer, context: InvocationContext): Promise<void> {
    const apiEndpoint = "https://myriadai-call-microservice-development.azurewebsites.net/queue/scheduleAsync";

    // Define tenantIDs
    const tenantIDs = ["0001", "0002", "0003", "0004", "0005", "0006", "0007"];
    const yesterdayDate = moment().subtract(1, 'day').format('YYYY-MM-DD');

    try {
        const requests = [];

        for (const tenantID of tenantIDs) {
            for (const isLive of ["true", "false"]) {
                const requestBody = {
                    tenantId: tenantID,
                    date: yesterdayDate,
                    scheduleTime: new Date().toISOString(),
                    triggeredBy: "system",
                    isLive
                };

                requests.push(
                    axios.post(apiEndpoint, requestBody)
                        .then(res => ({
                            status: 'fulfilled',
                            tenantID,
                            isLive,
                            response: res
                        }))
                        .catch(err => ({
                            status: 'rejected',
                            tenantID,
                            isLive,
                            error: err
                        }))
                );
            }
        }

        const results = await Promise.all(requests);

        results.forEach(result => {
            if (result.status === "fulfilled") {
                context.log(`✅ Success | tenantId: ${result.tenantID} | isLive: ${result.isLive}`);
                context.log(`📦 Response: ${JSON.stringify(result.response.data)}`);
            } else {
                context.log(`❌ Failure | tenantId: ${result.tenantID} | isLive: ${result.isLive}`);
                context.log(`🧨 Error: ${result.error.message}`);
            }
        });

    } catch (error) {
        context.log(`💥 Unexpected error in main try: ${error.message}`);
    }
}

// ⏰ Schedule: every day at 1:00 AM IST (7:30 PM UTC)
app.timer('Metric', {
    schedule: '0 30 19 * * *',
    handler: Metric
});
