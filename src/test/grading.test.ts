import { describe, expect, it } from "vitest";
import { computeGPA, gradeFor } from "@/lib/grading";

describe("grading scale", () => {
  it("gives an A from 70", () => expect(gradeFor(70)).toEqual({ grade: "A", points: 5 }));
  it("gives a B at 69", () => expect(gradeFor(69).grade).toBe("B"));
  it("gives a D at 45", () => expect(gradeFor(45)).toEqual({ grade: "D", points: 2 }));
  it("fails below 40", () => expect(gradeFor(39).grade).toBe("F"));
});

describe("GPA", () => {
  it("weights points by course units", () => {
    // 3 units of A (15) + 2 units of C (6) = 21 / 5 = 4.2
    expect(computeGPA([{ units: 3, points: 5 }, { units: 2, points: 3 }])).toBe(4.2);
  });
  it("is zero with no graded courses", () => expect(computeGPA([])).toBe(0));
});
