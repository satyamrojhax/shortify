import { useState, useEffect } from "react";
import { get, set } from "@/lib/storage";

export type EnrolledCourse = {
  slug: string;
  folder: string;
  title: string;
  enrolledAt: string;
  courseimage?: string;
};

export function useEnrolledCourses() {
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);

  useEffect(() => {
    try {
      const stored = get<EnrolledCourse[]>("enrolled_courses", []);
      setEnrolled(stored);
    } catch (e) {
      console.error("Failed to parse enrolled courses", e);
    }
  }, []);

  const enroll = (course: EnrolledCourse) => {
    const newEnrolled = [...enrolled, course];
    setEnrolled(newEnrolled);
    set("enrolled_courses", newEnrolled);
  };

  const isEnrolled = (slug: string) => {
    return enrolled.some((c) => c.slug === slug);
  };

  const unenroll = (slug: string) => {
    const newEnrolled = enrolled.filter((c) => c.slug !== slug);
    setEnrolled(newEnrolled);
    set("enrolled_courses", newEnrolled);
  };

  return { enrolled, enroll, unenroll, isEnrolled };
}
