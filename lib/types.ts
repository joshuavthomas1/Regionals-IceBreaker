export type Person = {
  id: number;
  name: string;
  company: string;
  title: string;
  funFact: string;
};

export type Attendee = Person & {
  code: string;
  createdAt: string;
};

export type BoardRow = {
  id: number;
  name: string;
  company: string;
  title: string;
  score: number;
  rank: number;
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
  funFact: string;
};
