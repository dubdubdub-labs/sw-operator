import { convertToModelMessages, streamText, type UIMessage } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: "gpt-5",
    messages: convertToModelMessages(messages),
    tools: {
      //   // server-side tool with execute function:
      //   getWeatherInformation: {
      //     description: "show the weather in a given city to the user",
      //     inputSchema: z.object({ city: z.string() }),
      //     execute: async ({}: { city: string }) => {
      //       const weatherOptions = ["sunny", "cloudy", "rainy", "snowy", "windy"];
      //       return weatherOptions[
      //         Math.floor(Math.random() * weatherOptions.length)
      //       ];
      //     },
      //   },
      //   // client-side tool that starts user interaction:
      //   askForConfirmation: {
      //     description: "Ask the user for confirmation.",
      //     inputSchema: z.object({
      //       message: z.string().describe("The message to ask for confirmation."),
      //     }),
      //   },
      //   // client-side tool that is automatically executed on the client:
      //   getLocation: {
      //     description:
      //       "Get the user location. Always ask for confirmation before using this tool.",
      //     inputSchema: z.object({}),
      //   },
    },
  });

  return result.toUIMessageStreamResponse();
}
