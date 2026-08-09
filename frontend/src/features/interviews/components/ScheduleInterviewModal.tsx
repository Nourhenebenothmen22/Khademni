"use client";

import { useState } from "react";
import { Calendar, Clock, Video, UserCheck, MapPin, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { scheduleInterviewApi } from "../api/interviews-api";
import type { InterviewType, MeetingProvider } from "@/types/backend";

interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  applicationId: string;
  candidateName: string;
  jobTitle: string;
  availableInterviewers?: Array<{ id: string; fullName: string; email: string }>;
}

export function ScheduleInterviewModal({
  isOpen,
  onClose,
  onSuccess,
  applicationId,
  candidateName,
  jobTitle,
  availableInterviewers = [],
}: ScheduleInterviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(`${jobTitle} — Interview`);
  const [type, setType] = useState<InterviewType>("TECHNICAL");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [provider, setProvider] = useState<MeetingProvider>("ZOOM");
  const [customMeetingUrl, setCustomMeetingUrl] = useState("");
  const [locationDetails, setLocationDetails] = useState("");
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<string[]>([]);
  const [description, setDescription] = useState("");

  if (!isOpen) return null;

  const handleToggleInterviewer = (id: string) => {
    setSelectedInterviewerIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !startTime) {
      toast.error("Please select date and start time");
      return;
    }

    if (selectedInterviewerIds.length === 0 && availableInterviewers.length > 0) {
      toast.error("Please assign at least one interviewer");
      return;
    }

    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

    setLoading(true);
    try {
      const res = await scheduleInterviewApi({
        applicationId,
        title,
        description: description || undefined,
        type,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
        timezone,
        meetingProvider: provider,
        customMeetingUrl: customMeetingUrl || undefined,
        locationDetails: locationDetails || undefined,
        interviewerIds: selectedInterviewerIds.length > 0 ? selectedInterviewerIds : [availableInterviewers[0]?.id].filter(Boolean),
      });

      if (res.success) {
        toast.success("Interview scheduled & Brevo invitation emails dispatched!");
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || "Failed to schedule interview");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-zinc-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">
              Schedule Candidate Interview
            </h3>
            <p className="text-xs text-zinc-500">
              Candidate: <span className="font-medium text-zinc-700">{candidateName}</span> • Position: <span className="font-medium text-zinc-700">{jobTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title & Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Interview Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Interview Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as InterviewType)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="SCREENING">Screening Call</option>
                <option value="TECHNICAL">Technical Interview</option>
                <option value="PEDAGOGICAL_DEMO">Pedagogical Teaching Demo</option>
                <option value="BEHAVIORAL">Behavioral Fit</option>
                <option value="FINAL_HR">Final HR Round</option>
              </select>
            </div>
          </div>

          {/* Date, Time, Duration */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                <Calendar className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
                Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                min={new Date().toISOString().split("T")[0]}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                <Clock className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Duration (minutes)
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value={15}>15 mins</option>
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins</option>
                <option value={90}>90 mins</option>
              </select>
            </div>
          </div>

          {/* Provider & Video Link */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                <Video className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
                Video Meeting Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as MeetingProvider)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                <option value="ZOOM">Zoom S2S (Auto Create)</option>
                <option value="GOOGLE_MEET">Google Meet</option>
                <option value="MS_TEAMS">Microsoft Teams</option>
                <option value="CUSTOM_LINK">Custom URL / Jitsi</option>
                <option value="IN_PERSON">In-Person</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Timezone
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {(provider === "CUSTOM_LINK" || provider === "GOOGLE_MEET" || provider === "MS_TEAMS") && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                Custom Video Meeting URL (Optional)
              </label>
              <input
                type="url"
                value={customMeetingUrl}
                onChange={(e) => setCustomMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          )}

          {provider === "IN_PERSON" && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1">
                <MapPin className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
                Physical Location / Room Details
              </label>
              <input
                type="text"
                value={locationDetails}
                onChange={(e) => setLocationDetails(e.target.value)}
                placeholder="Building B, Room 204, Campus Main"
                className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          )}

          {/* Assigned Panel Interviewers */}
          {availableInterviewers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-2">
                <UserCheck className="w-3.5 h-3.5 inline mr-1 text-blue-500" />
                Assign Panel Evaluators
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 border border-zinc-200 rounded-lg">
                {availableInterviewers.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 p-2 text-xs rounded-md bg-zinc-50 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedInterviewerIds.includes(user.id)}
                      onChange={() => handleToggleInterviewer(user.id)}
                      className="rounded-xs text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-zinc-800">{user.fullName}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notes / Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 mb-1">
              Instructions / Notes for Candidate
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please prepare a 10-minute lesson demonstration on high school algebra..."
              className="w-full text-sm px-3 py-2 rounded-lg border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending Brevo Invites...
                </>
              ) : (
                "Confirm & Dispatch Invites"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
