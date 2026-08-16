const API_BASE_URL = "http://localhost:8080/api";


export const loginStudent = async (
  studentId,
  password
) => {

  const response = await fetch(
    `${API_BASE_URL}/student/login`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        studentId,
        password,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Invalid Student ID or Password");
  }

  return response.json();
};


export const getStudentAttendance = async (
  studentId
) => {

  const response = await fetch(
    `${API_BASE_URL}/student/${studentId}/attendance`
  );

  if (!response.ok) {
    throw new Error(
      "Unable to fetch attendance"
    );
  }

  return response.json();
};