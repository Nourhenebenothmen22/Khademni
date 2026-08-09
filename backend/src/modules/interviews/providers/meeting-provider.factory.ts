import type { MeetingProvider } from "../../../generated/prisma/client.js";
import { logger } from "../../../lib/logger.js";

export interface CreateMeetingInput {
  topic: string;
  startTime: Date;
  durationMinutes: number;
  provider: MeetingProvider;
  customMeetingUrl?: string;
  locationDetails?: string;
}

export interface MeetingResult {
  meetingUrl: string;
  meetingId?: string;
  meetingPasscode?: string;
  providerUsed: MeetingProvider;
}

export async function createMeetingLink(
  input: CreateMeetingInput,
): Promise<MeetingResult> {
  const { provider, customMeetingUrl, locationDetails, topic, startTime, durationMinutes } = input;

  switch (provider) {
    case "CUSTOM_LINK": {
      return {
        meetingUrl: customMeetingUrl || "https://meet.jit.si/Khademni-Interview-" + Math.random().toString(36).substring(2, 9),
        providerUsed: "CUSTOM_LINK",
      };
    }

    case "IN_PERSON": {
      return {
        meetingUrl: customMeetingUrl || "",
        providerUsed: "IN_PERSON",
      };
    }

    case "ZOOM": {
      try {
        const zoomClientId = process.env.ZOOM_CLIENT_ID;
        const zoomClientSecret = process.env.ZOOM_CLIENT_SECRET;
        const zoomAccountId = process.env.ZOOM_ACCOUNT_ID;

        if (zoomClientId && zoomClientSecret && zoomAccountId) {
          // Perform S2S OAuth token fetch
          const authHeader = Buffer.from(`${zoomClientId}:${zoomClientSecret}`).toString("base64");
          const tokenRes = await fetch(
            `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${zoomAccountId}`,
            {
              method: "POST",
              headers: { Authorization: `Basic ${authHeader}` },
            },
          );

          if (tokenRes.ok) {
            const tokenData = await tokenRes.json() as { access_token: string };
            const createMeetingRes = await fetch("https://api.zoom.us/v2/users/me/meetings", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                topic,
                type: 2, // Scheduled meeting
                start_time: startTime.toISOString(),
                duration: durationMinutes,
                settings: {
                  join_before_host: true,
                  waiting_room: true,
                },
              }),
            });

            if (createMeetingRes.ok) {
              const meetingData = await createMeetingRes.json() as {
                join_url: string;
                id: number | string;
                password?: string;
              };
              return {
                meetingUrl: meetingData.join_url,
                meetingId: String(meetingData.id),
                meetingPasscode: meetingData.password || undefined,
                providerUsed: "ZOOM",
              };
            }
          }
        }
      } catch (err) {
        logger.warn({ err }, "Zoom API meeting creation failed, falling back to custom link");
      }

      // Graceful Fallback
      return {
        meetingUrl: customMeetingUrl || "https://zoom.us/j/fallback-" + Math.random().toString(36).substring(2, 9),
        providerUsed: "CUSTOM_LINK",
      };
    }

    case "GOOGLE_MEET": {
      if (customMeetingUrl) {
        return {
          meetingUrl: customMeetingUrl,
          providerUsed: "GOOGLE_MEET",
        };
      }
      return {
        meetingUrl: "https://meet.google.com/khademni-" + Math.random().toString(36).substring(2, 6) + "-" + Math.random().toString(36).substring(2, 5),
        providerUsed: "GOOGLE_MEET",
      };
    }

    default: {
      return {
        meetingUrl: customMeetingUrl || "",
        providerUsed: provider,
      };
    }
  }
}
