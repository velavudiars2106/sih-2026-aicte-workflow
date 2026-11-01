const API_URL = "http://127.0.0.1:8000";

export async function checkBackend() {
  const response = await fetch(`${API_URL}/api/health`);

  if (!response.ok) {
    throw new Error("Backend request failed");
  }

  return response.json();
}

export async function getDashboard() {
  const response = await fetch(`${API_URL}/api/dashboard`);

  if (!response.ok) {
    throw new Error("Could not load dashboard");
  }

  return response.json();
}

export async function submitData(data) {
  const response = await fetch(`${API_URL}/api/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error("Data submission failed");
  }

  return response.json();
}