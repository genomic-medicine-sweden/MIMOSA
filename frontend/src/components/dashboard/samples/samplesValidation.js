import postcodeCoordinates from "@/assets/postcode-coordinates";

export const validatePostCode = (value) => {
  if (!value?.trim()) return "";

  const digitsOnly = value.replace(/\D/g, "");

  if (!/^\d{5}$/.test(digitsOnly)) {
    return "Postcode must be 5 digits.";
  }

  const prefixed = `SE-${digitsOnly}`;
  if (!postcodeCoordinates.hasOwnProperty(prefixed)) {
    return `Postcode ${prefixed} is not supported.`;
  }

  return "";
};

export const validateDate = (value) => {
  if (!value?.trim()) return "";

  const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoDateRegex.test(value)) {
    return "Invalid date format (YYYY-MM-DD).";
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    return "Invalid calendar date.";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date > today) {
    return "Date cannot be in the future.";
  }

  return "";
};

export const fieldValidators = {
  Date: validateDate,
  PostCode: validatePostCode,
};
