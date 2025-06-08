import { firebaseDb } from "@/lib/firebase";
import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  QuerySnapshot,
  DocumentData
} from "firebase/firestore";

// ---- User Profile ----
export type PersonalInfo = {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  skills?: string[];
};

export async function getUserProfile(uid: string): Promise<PersonalInfo | null> {
  const ref = doc(firebaseDb, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as PersonalInfo) : null;
}

export async function updateUserProfile(uid: string, data: Partial<PersonalInfo>): Promise<void> {
  const ref = doc(firebaseDb, "users", uid);
  await setDoc(ref, data, { merge: true });
}

// ---- Resumes & Analysis ----
export type ResumeRecord = {
  id: string;
  filename: string;
  uploadedAt: Timestamp;
};

export async function listUserResumes(uid: string): Promise<ResumeRecord[]> {
  const col = collection(firebaseDb, "users", uid, "resumes");
  const snaps = await getDocs(col);
  return snaps.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ResumeRecord, 'id'>) }));
}

export async function addUserResume(uid: string, data: Omit<ResumeRecord, 'id'>): Promise<string> {
  const col = collection(firebaseDb, "users", uid, "resumes");
  const docRef = await addDoc(col, data);
  return docRef.id;
}

export async function deleteUserResume(uid: string, resumeId: string): Promise<void> {
  const ref = doc(firebaseDb, "users", uid, "resumes", resumeId);
  await deleteDoc(ref);
}

export type ResumeAnalysis = {
  analyzedAt: Timestamp;
  result: any;
};

export async function addResumeAnalysis(uid: string, resumeId: string, analysis: any): Promise<void> {
  const ref = doc(firebaseDb, "users", uid, "resumes", resumeId, "analysis", "latest");
  await setDoc(ref, { analyzedAt: Timestamp.now(), result: analysis });
}

export async function getResumeAnalysis(uid: string, resumeId: string): Promise<ResumeAnalysis | null> {
  const ref = doc(firebaseDb, "users", uid, "resumes", resumeId, "analysis", "latest");
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as ResumeAnalysis) : null;
}

// ---- Primary Resume Flag ----
export async function setPrimaryResume(uid: string, resumeId: string): Promise<void> {
  const col = collection(firebaseDb, "users", uid, "resumes");
  const snaps = await getDocs(col);
  // Unset all
  await Promise.all(snaps.docs.map(docSnap => updateDoc(docSnap.ref, { primary: docSnap.id === resumeId })));
}

export async function getPrimaryResume(uid: string): Promise<ResumeRecord | null> {
  const col = collection(firebaseDb, "users", uid, "resumes");
  const snaps = await getDocs(col);
  const docSnap = snaps.docs.find(d => d.data().primary === true);
  return docSnap ? { id: docSnap.id, ...(docSnap.data() as Omit<ResumeRecord, 'id'>) } : null;
}

// ---- Work Experience ----
export type Experience = {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  description?: string;
};

export async function listExperiences(uid: string): Promise<Experience[]> {
  const col = collection(firebaseDb, "users", uid, "experience");
  const snaps = await getDocs(col);
  return snaps.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Experience, 'id'>) }));
}

export async function addExperience(uid: string, exp: Omit<Experience, 'id'>): Promise<string> {
  const col = collection(firebaseDb, "users", uid, "experience");
  const docRef = await addDoc(col, exp);
  return docRef.id;
}

export async function updateExperience(uid: string, expId: string, exp: Partial<Experience>): Promise<void> {
  const ref = doc(firebaseDb, "users", uid, "experience", expId);
  await updateDoc(ref, exp);
}

export async function deleteExperience(uid: string, expId: string): Promise<void> {
  const ref = doc(firebaseDb, "users", uid, "experience", expId);
  await deleteDoc(ref);
}

// ---- Education ----
export type Education = {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  description?: string;
};

export async function listEducation(uid: string): Promise<Education[]> {
  const col = collection(firebaseDb, "users", uid, "education");
  const snaps = await getDocs(col);
  return snaps.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Education, 'id'>) }));
}

export async function addEducation(uid: string, edu: Omit<Education, 'id'>): Promise<string> {
  const col = collection(firebaseDb, "users", uid, "education");
  const docRef = await addDoc(col, edu);
  return docRef.id;
}

export async function updateEducation(uid: string, eduId: string, edu: Partial<Education>): Promise<void> {
  const ref = doc(firebaseDb, "users", uid, "education", eduId);
  await updateDoc(ref, edu);
}

export async function deleteEducation(uid: string, eduId: string): Promise<void> {
  const ref = doc(firebaseDb, "users", uid, "education", eduId);
  await deleteDoc(ref);
}

// ---- Career Interests ----
export async function updateCareerInterests(uid: string, interests: string[]): Promise<void> {
  const ref = doc(firebaseDb, "users", uid);
  await setDoc(ref, { careerInterests: interests }, { merge: true });
}

// ---- Saved Searches ----
export type SavedSearch = {
  id: string;
  name: string;
  query: any;
  createdAt: Timestamp;
};

export async function listSavedSearches(uid: string): Promise<SavedSearch[]> {
  const col = collection(firebaseDb, "users", uid, "savedSearches");
  const snaps = await getDocs(col);
  return snaps.docs.map(d => ({ id: d.id, ...(d.data() as Omit<SavedSearch, 'id'>) }));
}

export async function addSavedSearch(uid: string, search: Omit<SavedSearch, 'id'>): Promise<string> {
  const col = collection(firebaseDb, "users", uid, "savedSearches");
  const docRef = await addDoc(col, search);
  return docRef.id;
}

export async function removeSavedSearch(uid: string, searchId: string): Promise<void> {
  const ref = doc(firebaseDb, "users", uid, "savedSearches", searchId);
  await deleteDoc(ref);
}

// ---- Saved Jobs ----
export type SavedJob = {
  id: string;
  title: string;
  company: string;
  location?: string;
  postedAt: Timestamp;
};

export async function listSavedJobs(uid: string): Promise<SavedJob[]> {
  const col = collection(firebaseDb, "users", uid, "savedJobs");
  const snaps = await getDocs(col);
  return snaps.docs.map(d => ({ id: d.id, ...(d.data() as Omit<SavedJob, 'id'>) }));
}

export async function addSavedJob(uid: string, job: Omit<SavedJob, 'id'>): Promise<string> {
  const col = collection(firebaseDb, "users", uid, "savedJobs");
  const docRef = await addDoc(col, job);
  return docRef.id;
}

export async function removeSavedJob(uid: string, jobId: string): Promise<void> {
  const ref = doc(firebaseDb, "users", uid, "savedJobs", jobId);
  await deleteDoc(ref);
}

// ---- Career Paths ----
export type CareerPath = {
  id: string;
  title: string;
  description?: string;
  createdAt: Timestamp;
};

export async function listSavedCareerPaths(uid: string): Promise<CareerPath[]> {
  const col = collection(firebaseDb, "users", uid, "careerPaths");
  const snaps = await getDocs(col);
  return snaps.docs.map(d => ({ id: d.id, ...(d.data() as Omit<CareerPath, 'id'>) }));
}

export async function addSavedCareerPath(uid: string, path: Omit<CareerPath, 'id'>): Promise<string> {
  const col = collection(firebaseDb, "users", uid, "careerPaths");
  const docRef = await addDoc(col, path);
  return docRef.id;
}

export async function removeSavedCareerPath(uid: string, pathId: string): Promise<void> {
  const ref = doc(firebaseDb, "users", uid, "careerPaths", pathId);
  await deleteDoc(ref);
}

// ---- Cover Letters (Placeholder for future) ----
// export type CoverLetter = { ... };
// export async function addCoverLetter(...) { ... }

// ---- Interview Prep (Placeholder for future) ----
// export type InterviewPrep = { ... };
// export async function addInterviewPrep(...) { ... }

// ---- Applications ----
export type ApplicationRecord = {
  id: string;
  title: string;
  company: string;
  status: string;
  appliedAt: Timestamp;
};

export async function listApplications(uid: string): Promise<ApplicationRecord[]> {
  const col = collection(firebaseDb, "users", uid, "applications");
  const snaps = await getDocs(col);
  return snaps.docs.map(d => ({ id: d.id, ...(d.data() as Omit<ApplicationRecord, 'id'>) }));
}

export async function addApplication(uid: string, app: Omit<ApplicationRecord, 'id'>): Promise<string> {
  const col = collection(firebaseDb, "users", uid, "applications");
  const docRef = await addDoc(col, app);
  return docRef.id;
}

export async function updateApplication(uid: string, appId: string, data: Partial<ApplicationRecord>): Promise<void> {
  const ref = doc(firebaseDb, "users", uid, "applications", appId);
  await updateDoc(ref, data);
}

export async function deleteApplication(uid: string, appId: string): Promise<void> {
  const ref = doc(firebaseDb, "users", uid, "applications", appId);
  await deleteDoc(ref);
}
