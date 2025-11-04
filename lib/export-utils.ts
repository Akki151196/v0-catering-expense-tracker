export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) {
    alert("No data to export")
    return
  }

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          if (value === null || value === undefined) return ""
          if (typeof value === "string" && value.includes(",")) {
            return `"${value}"`
          }
          return value
        })
        .join(","),
    ),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}-${new Date().toISOString().split("T")[0]}.csv`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function generateProfitLossReport(eventName: string, expenses: any[], totalRevenue = 0) {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const profit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(2) : "0"

  const categoryBreakdown = expenses.reduce((acc: any, expense) => {
    const categoryName = expense.categories?.name || "Other"
    const existing = acc.find((item: any) => item.category === categoryName)
    if (existing) {
      existing.amount += expense.amount
      existing.count += 1
    } else {
      acc.push({ category: categoryName, amount: expense.amount, count: 1 })
    }
    return acc
  }, [])

  return {
    eventName,
    totalRevenue: totalRevenue.toFixed(2),
    totalExpenses: totalExpenses.toFixed(2),
    profit: profit.toFixed(2),
    profitMargin,
    categoryBreakdown,
    generatedAt: new Date().toISOString(),
  }
}

export function exportReportToJSON(report: any, eventName: string) {
  const jsonContent = JSON.stringify(report, null, 2)
  const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)
  link.setAttribute("href", url)
  link.setAttribute("download", `${eventName}-report-${new Date().toISOString().split("T")[0]}.json`)
  link.style.visibility = "hidden"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
