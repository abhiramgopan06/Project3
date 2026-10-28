export function formatMoney(amount) {
  const number = Number(amount) || 0;
  return "₹" + number.toLocaleString("en-IN");
}
export function formatDate(dateText) {
  return new Date(dateText).toLocaleDateString("en-IN");
}
export function getErrorMessage(error, fallback) {
  if (!error.response) {
    return "Could not reach the server. Please check that the backend is running and try again.";
  }

  const data = error.response.data;
  if (typeof data === "string") {
    const plainText = data.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (/<!doctype html|<html|TypeError at|Traceback/i.test(data)) {
      return fallback || "Something went wrong while loading this page. Please try again.";
    }
    return plainText.slice(0, 240) || fallback || "Something went wrong. Please try again.";
  }
  if (data && data.detail) {
    return data.detail;
  }
  if (data && data.non_field_errors && data.non_field_errors.length > 0) {
    return data.non_field_errors[0];
  }
  if (data) {
    const fieldNames = Object.keys(data);
    if (fieldNames.length > 0) {
      const firstField = fieldNames[0];
      let firstMessage = data[firstField];
      if (Array.isArray(firstMessage)) {
        firstMessage = firstMessage[0];
      }
      if (typeof firstMessage === "string") {
        return firstField.replace(/_/g, " ") + ": " + firstMessage;
      }
    }
  }

  return fallback || "Something went wrong. Please try again.";
}
