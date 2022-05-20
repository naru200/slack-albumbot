import { AwsLambdaReceiver, App, subtype } from "@slack/bolt";
import got from "got";
import { S3 } from "aws-sdk";

const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver: awsLambdaReceiver,
});

const s3 = new S3();

app.message(subtype("file_share"), async ({ event, client }) => {
  if ("files" in event) {
    await Promise.all(
      event.files.map(async ({ url_private, name, mimetype }) => {
        const image = await got(url_private, {
          headers: { Authorization: process.env.SLACK_BOT_TOKEN },
          responseType: "buffer",
        }).buffer();

        await s3
          .upload({
            Bucket: "slackbot-images",
            Key: name,
            ContentType: mimetype,
            Body: image,
          })
          .promise();
      }),
    );

    await client.reactions.add({
      name: "white_check_mark",
      timestamp: event.event_ts,
      channel: event.channel,
    });
  }
});

export const handler = async (event, context, callback) =>
  (await awsLambdaReceiver.start())(event, context, callback);
