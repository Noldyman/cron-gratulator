require("dotenv").config();
import OpenAI from "openai";
import schedule from "node-schedule";
import { Birthday, BirthdayWithMessage } from "./models/birthday";

const env = {
  serverBaseUrl: process.env.SERVER_BASE_URL,
  homepageApiPort: process.env.HOMEPAGE_API_PORT,
  whatsApiPort: process.env.WHATS_API_PORT,
  openaiApiKey: process.env.OPENAI_API_KEY,
};

const openai = new OpenAI({ apiKey: env.openaiApiKey });

const getTodaysBirthdays = async (): Promise<Birthday[]> => {
  const response = await fetch(
    `${env.serverBaseUrl}:${env.homepageApiPort}/api/birthdays?interval=day`
  );
  const data: Birthday[] = await response.json();
  return data;
};

const createPrompt = (birthday: Birthday) => {
  return `create a text message to congratulate ${birthday.nickName || birthday.firstName}, my ${
    birthday.relationType
  }, with their ${birthday.newAge}th birthday. Use the following language: ${
    birthday.language
  }. Be overly enthousiastic, use many smileys and don't be shy of hashtags.`;
};

const generateMessages = async (birthdays: Birthday[]): Promise<BirthdayWithMessage[]> => {
  return await Promise.all(
    birthdays.map((b) =>
      openai.chat.completions
        .create({
          messages: [
            {
              role: "assistant",
              content: createPrompt(b),
            },
          ],
          model: "gpt-3.5-turbo",
        })
        .then((result) => ({
          ...b,
          message: `${result.choices[0].message.content}\n_You've been Cron-Gratulated..._` || "",
        }))
    )
  );
};

const sendWhatsappMessages = async (messages: BirthdayWithMessage[]) => {
  const payload = {
    messages: messages.map((m) => ({
      phoneNumber: m.phoneNumber,
      recipientName: m.nameSavedInPhone,
      text: m.message,
    })),
  };

  await fetch(`${env.serverBaseUrl}:${env.whatsApiPort}/api/whatsapp`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });
};

const generateAndSendBirthdayMessages = async () => {
  try {
    const birthdays = await getTodaysBirthdays();
    const filteredBirthdays = birthdays.filter(
      (b) => b.sendAutomaticMessage && b.phoneNumber && b.nameSavedInPhone
    );
    const messages = await generateMessages(filteredBirthdays);
    await sendWhatsappMessages(messages);
  } catch (error: any) {
    console.log(`An error occured: ${JSON.stringify(error)}`);
    return [];
  }
};

const startApp = () => {
  const rule = new schedule.RecurrenceRule();
  rule.hour = 8;
  rule.minute = 30;
  rule.tz = "Europe/Amsterdam";

  schedule.scheduleJob(rule, generateAndSendBirthdayMessages);
  console.log("Cron-Gratulator has been started...");
};

startApp();
