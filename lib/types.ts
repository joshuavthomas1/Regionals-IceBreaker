import type { Church } from "@/lib/churches";

export type Person = {
  id: number;
  name: string;
  company: string;
  title: string;
  church: Church | "";
  funFact: string;
};

export type Attendee = Person & {
  code: string;
  createdAt: string;
};

export type BoardRow = {
  id: number;
  name: string;
  church: Church | "";
  score: number;
  rank: number;
};

export type ChurchProgress = {
  church: Church;
  met: number;
  pool: number;
  headcount: number;
  yours: boolean;
};

export type YouSpot = {
  id: number;
  name: string;
  score: number;
  rank: number;
};

export type RecentMeet = {
  id: number;
  scannerName: string;
  scannedName: string;
  createdAt: string;
};

export type BoardSnapshot = {
  leaders: BoardRow[];
  you: YouSpot | null;
  recent: RecentMeet[];
  attendeeCount: number;
  meetingCount: number;
  others: number;
  churches: ChurchProgress[];
  truncated: boolean;
};

export type MeetingStatus = "not_found" | "self" | "already" | "met";

export type MeetingPayload = {
  status: MeetingStatus;
  person?: Person;
};

export type CheckInPayload = {
  attendee: {
    id: number;
    name: string;
    company: string;
    title: string;
  };
  meeting: MeetingPayload | null;
};

export type MetPerson = Person & {
  metAt: string;
};

export type NewAttendee = {
  name: string;
  company: string;
  title: string;
  church: Church;
  funFact: string;
};
