import { app, InvocationContext, Timer } from "@azure/functions";
import axios from "axios";
import moment = require("moment");

export async function Metric(myTimer: Timer, context: InvocationContext): Promise<void> {
    const primaryEndpoint = process.env.API_ENDPOINT;
    const secondaryEndpoint = process.env.NEW_API_ENDPOINT;

    context.log(`📡 Primary API Endpoint: ${primaryEndpoint}`);
    context.log(`📡 Secondary API Endpoint: ${secondaryEndpoint}`);

    const tenantIDs = ["0001", "0002", "0003", "0004", "0005", "0006", "0007", "0008", "0009"];
    const yesterdayDate = moment().format('YYYY-MM-DD');

    const currentISTTime = moment().utcOffset("+05:30").format('YYYY-MM-DD HH:mm:ss');
    context.log(`🕰️ Current IST Time: ${currentISTTime}`);

    try {
        const requests = [];

        for (const tenantID of tenantIDs) {
            for (const isLive of ["true", "false"]) {
                const requestBody = {
                    tenantId: tenantID,
                    date: yesterdayDate,
                    scheduleTime: new Date().toISOString(),
                    triggeredBy: "system",
                    isLiveMode: isLive
                };

                // Send to both endpoints
                for (const endpoint of [primaryEndpoint, secondaryEndpoint]) {
                    requests.push(
                        axios.post(endpoint, requestBody)
                            .then(res => ({
                                status: 'fulfilled',
                                tenantID,
                                isLive,
                                endpoint,
                                response: res
                            }))
                            .catch(err => ({
                                status: 'rejected',
                                tenantID,
                                isLive,
                                endpoint,
                                error: err
                            }))
                    );
                }
            }
        }

        const results = await Promise.all(requests);

        results.forEach(result => {
            const tag = `tenantId: ${result.tenantID} | isLive: ${result.isLive} | endpoint: ${result.endpoint}`;
            if (result.status === "fulfilled") {
                context.log(`✅ Success | ${tag}`);
                context.log(`📦 Response: ${JSON.stringify(result.response.data)}`);
            } else {
                context.log(`❌ Failure | ${tag}`);
                context.log(`🧨 Error: ${result.error?.message || 'Unknown error'}`);
            }
        });

    } catch (error: any) {
        context.log(`💥 Unexpected error in main try: ${error?.message}`);
    }
}

// ⏰ Schedule: every day at 1:00 AM IST (7:30 PM UTC)
app.timer('Metric', {
    schedule: '0 30 19 * * *',
    handler: Metric
});
