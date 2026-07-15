const currencyFormatter = new Intl.NumberFormat("es-NI", {
  style: "currency",
  currency: "NIO",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatCurrency = (amount: number) => {
  return currencyFormatter.format(amount);
};

const dateFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export const formatDate = (dateString: string) => {
  return dateFormatter.format(new Date(dateString));
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatDateWithTime = (dateString: string) => {
  return dateTimeFormatter.format(new Date(dateString));
};
