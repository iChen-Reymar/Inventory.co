import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from './Layout'
import SalesDateRangeModal from './SalesDateRangeModal'
import PayUtangModal from './PayUtangModal'
import { useAuth } from '../contexts/AuthContext'
import { statsService } from '../services/statsService'
import { formatDateRange } from '../utils/dateRange'
import { formatPaymentMethod, isUtangPayment, isUtangPaid, isUtangUnpaid, isUtangPartial, getUtangPaidAmount, getUtangRemaining, parseUtangPaymentHistory, formatPartialPaymentDate } from '../utils/paymentMethod'

const PERIODS = [
  { id: 'daily', label: 'Today' },
  { id: 'weekly', label: 'This Week' },
  { id: 'monthly', label: 'This Month' }
]

const SCROLL_ITEM_LIMIT = 4

function ReportCountBadge({ count, variant = 'default' }) {
  return (
    <span className={`report-count-badge report-count-badge--${variant}`}>
      {count} {count === 1 ? 'item' : 'items'}
    </span>
  )
}

function ReportScrollHint() {
  return (
    <p className="report-scroll-hint">
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
      Scroll to view all entries
    </p>
  )
}

function ReportScrollContainer({ count, variant = 'default', desktop, mobile }) {
  const isScrollable = count > SCROLL_ITEM_LIMIT
  const scrollClasses = [
    isScrollable ? 'report-scroll-wrap report-scroll-wrap--active' : '',
    isScrollable && variant === 'cards' ? 'report-scroll-wrap--cards' : '',
    isScrollable && variant === 'staff' ? 'report-scroll-wrap--staff' : ''
  ].filter(Boolean).join(' ')

  const desktopWrapClass = isScrollable
    ? `relative ${scrollClasses}`
    : 'overflow-x-auto -mx-1 px-1'

  const mobileWrapClass = isScrollable
    ? `relative ${scrollClasses}`
    : ''

  return (
    <>
      {isScrollable && <ReportScrollHint />}
      <div className={`hidden md:block ${desktopWrapClass}`}>
        {desktop}
        {isScrollable && <div className="report-scroll-fade" aria-hidden="true" />}
      </div>
      <div className={`md:hidden ${mobileWrapClass}`}>
        <div className="space-y-3">{mobile}</div>
        {isScrollable && <div className="report-scroll-fade" aria-hidden="true" />}
      </div>
    </>
  )
}

function Reports() {
  const navigate = useNavigate()
  const { isAdmin, isStaff } = useAuth()
  const [period, setPeriod] = useState('daily')
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  const [report, setReport] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [payUtangOrder, setPayUtangOrder] = useState(null)

  const canAccess = isAdmin() || isStaff()
  const isCustomRange = period === 'custom' && dateRange.start && dateRange.end

  useEffect(() => {
    if (!canAccess) {
      navigate('/home', { replace: true })
      return
    }
    loadReport()
  }, [period, dateRange.start, dateRange.end, canAccess])

  const loadReport = async () => {
    try {
      if (period === 'custom' && (!dateRange.start || !dateRange.end)) {
        return
      }

      setLoading(true)
      const allStats = await statsService.getAllPeriodStats()
      setSummary(allStats)

      if (period === 'custom' && dateRange.start && dateRange.end) {
        const customReport = await statsService.getFullReportForDateRange(
          dateRange.start,
          dateRange.end
        )
        setReport(customReport)
        return
      }

      const fullReport = await statsService.getFullReport(period)
      setReport(fullReport)
    } catch (err) {
      console.error('Failed to load report:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePeriodChange = (nextPeriod) => {
    setPeriod(nextPeriod)
    setDateRange({ start: null, end: null })
  }

  const handleRangeChange = (range) => {
    setDateRange(range)
    if (range.start && range.end) {
      setPeriod('custom')
    }
  }

  const handleOpenCalendar = () => {
    setIsCalendarOpen(true)
  }

  const handleCloseCalendar = () => {
    setIsCalendarOpen(false)
  }

  const formatMoney = (amount) => `₱${(Number(amount) || 0).toFixed(2)}`

  const renderUtangStatus = (order) => {
    if (isUtangPaid(order)) {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
          Paid · {formatPaymentMethod(order.utang_paid_method)}
        </span>
      )
    }
    if (isUtangPartial(order)) {
      return (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
          Partial · {formatMoney(getUtangRemaining(order))} left
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
        Pending
      </span>
    )
  }

  const renderUtangAmount = (order) => {
    const paymentHistory = parseUtangPaymentHistory(order)

    if (isUtangPartial(order)) {
      return (
        <div>
          <p className="font-semibold text-amber-700">{formatMoney(getUtangRemaining(order))} left</p>
          <p className="text-xs text-green-700">{formatMoney(getUtangPaidAmount(order))} paid</p>
          {paymentHistory.length > 0 && (
            <div className="mt-1 space-y-0.5">
              {paymentHistory.map((payment, index) => (
                <p key={`${payment.paid_at}-${index}`} className="text-xs text-gray-500">
                  Partial {formatMoney(payment.amount)} · {formatPartialPaymentDate(payment.paid_at)}
                </p>
              ))}
            </div>
          )}
        </div>
      )
    }

    if (isUtangPaid(order) && paymentHistory.length > 0) {
      return (
        <div>
          <span className="font-semibold text-green-700">{formatMoney(order.total_amount)}</span>
          <div className="mt-1 space-y-0.5">
            {paymentHistory.map((payment, index) => (
              <p key={`${payment.paid_at}-${index}`} className="text-xs text-gray-500">
                {paymentHistory.length > 1 ? `Payment ${index + 1}` : 'Paid'} {formatMoney(payment.amount)} · {formatPartialPaymentDate(payment.paid_at)}
              </p>
            ))}
          </div>
        </div>
      )
    }

    return <span className="font-semibold text-amber-700">{formatMoney(order.total_amount)}</span>
  }

  const renderPayUtangButton = (order) => {
    if (isUtangPaid(order)) return null

    return (
      <button
        type="button"
        onClick={() => setPayUtangOrder(order)}
        className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
        title="Mark as paid"
        aria-label={`Pay utang for ${order.debtor_name || 'customer'}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      </button>
    )
  }

  const reportTitle = isCustomRange
    ? formatDateRange(dateRange.start, dateRange.end)
    : PERIODS.find((p) => p.id === period)?.label

  if (!canAccess) return null

  return (
    <Layout pageTitle="reports">
      <SalesDateRangeModal
        isOpen={isCalendarOpen}
        onClose={handleCloseCalendar}
        startDate={dateRange.start}
        endDate={dateRange.end}
        onRangeChange={handleRangeChange}
      />
      <PayUtangModal
        isOpen={!!payUtangOrder}
        onClose={() => setPayUtangOrder(null)}
        order={payUtangOrder}
        onPaid={loadReport}
      />
      <div className="ui-page">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sales Reports</h1>
          <p className="text-sm text-gray-600 mt-1">
            Income, transactions, and utang — updated when staff record sales.
          </p>
        </div>

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="report-stat-card bg-white border-gray-200">
              <p className="text-xs sm:text-sm text-gray-500 font-medium">Today</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600 mt-1">{formatMoney(summary.daily.income)}</p>
              <p className="text-xs text-gray-500 mt-1">{summary.daily.paidTransactions} paid sales</p>
              {summary.daily.utangTotal > 0 && (
                <p className="text-xs text-amber-700 mt-1.5 font-medium">
                  Utang: {formatMoney(summary.daily.utangTotal)} ({summary.daily.utangTransactions})
                </p>
              )}
            </div>
            <div className="report-stat-card bg-white border-gray-200">
              <p className="text-xs sm:text-sm text-gray-500 font-medium">This Week</p>
              <p className="text-xl sm:text-2xl font-bold text-primary-blue mt-1">{formatMoney(summary.weekly.income)}</p>
              <p className="text-xs text-gray-500 mt-1">{summary.weekly.paidTransactions} paid sales</p>
              {summary.weekly.utangTotal > 0 && (
                <p className="text-xs text-amber-700 mt-1.5 font-medium">
                  Utang: {formatMoney(summary.weekly.utangTotal)} ({summary.weekly.utangTransactions})
                </p>
              )}
            </div>
            <div className="report-stat-card bg-white border-gray-200">
              <p className="text-xs sm:text-sm text-gray-500 font-medium">This Month</p>
              <p className="text-xl sm:text-2xl font-bold text-indigo-600 mt-1">{formatMoney(summary.monthly.income)}</p>
              <p className="text-xs text-gray-500 mt-1">{summary.monthly.paidTransactions} paid sales</p>
              {summary.monthly.utangTotal > 0 && (
                <p className="text-xs text-amber-700 mt-1.5 font-medium">
                  Utang: {formatMoney(summary.monthly.utangTotal)} ({summary.monthly.utangTransactions})
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap items-center p-1 bg-gray-100/80 rounded-xl w-full sm:w-fit">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handlePeriodChange(p.id)}
              className={`report-period-btn flex-1 sm:flex-none ${
                period === p.id
                  ? 'bg-primary-blue text-white shadow-sm'
                  : 'bg-transparent text-gray-700 hover:bg-white/80'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleOpenCalendar}
            className={`report-period-btn gap-2 max-w-full flex-1 sm:flex-none ${
              isCustomRange
                ? 'bg-primary-blue text-white shadow-sm'
                : 'bg-transparent text-gray-700 hover:bg-white/80'
            }`}
            title="Select custom date range"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="truncate">{isCustomRange ? formatDateRange(dateRange.start, dateRange.end) : 'Calendar'}</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading report...</div>
        ) : report && (
          <>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Report for {reportTitle}
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="report-stat-card bg-green-50 border-green-200 col-span-1">
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Paid Income</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-700 mt-1">{formatMoney(report.income)}</p>
                <p className="text-xs text-gray-500 mt-1">{report.paidTransactions} paid sales</p>
              </div>
              <div className="report-stat-card bg-amber-50 border-amber-200 col-span-1">
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Utang</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-700 mt-1">{formatMoney(report.utangTotal)}</p>
                <p className="text-xs text-gray-500 mt-1">{report.utangTransactions} utang sales</p>
              </div>
              <div className="report-stat-card bg-blue-50 border-blue-200 col-span-1">
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Total Sales</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-blue mt-1">{formatMoney(report.totalSales)}</p>
                <p className="text-xs text-gray-500 mt-1">{report.transactions} all transactions</p>
              </div>
              <div className="report-stat-card bg-purple-50 border-purple-200 col-span-1">
                <p className="text-xs sm:text-sm text-gray-600 font-medium">Items Sold</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-700 mt-1">{report.itemsSold}</p>
              </div>
            </div>

            {report.totalDiscounts > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total Discounts Given</p>
                <p className="text-2xl font-bold text-amber-700">{formatMoney(report.totalDiscounts)}</p>
              </div>
            )}

            {isAdmin() && report.byStaff?.length > 0 && (
              <section className="ui-card report-section shadow-sm border-indigo-100 bg-gradient-to-br from-indigo-50/40 to-white">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-indigo-100/80">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">Staff Sales Report</h2>
                  <ReportCountBadge count={report.byStaff.length} variant="staff" />
                </div>
                <ReportScrollContainer
                  count={report.byStaff.length}
                  variant="staff"
                  desktop={
                    <table className="w-full ui-table report-table min-w-[32rem]">
                      <thead>
                        <tr className="border-b border-gray-200 text-left">
                          <th>Staff</th>
                          <th>Income</th>
                          <th>Utang</th>
                          <th>Transactions</th>
                          <th>Items Sold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.byStaff.map((row) => (
                          <tr key={row.staffName} className="border-b border-gray-100">
                            <td className="font-medium">{row.staffName}</td>
                            <td className="text-green-700 font-semibold">{formatMoney(row.income)}</td>
                            <td className="text-amber-700 font-semibold">{formatMoney(row.utangTotal)}</td>
                            <td>{row.transactions}</td>
                            <td>{row.itemsSold}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  }
                  mobile={report.byStaff.map((row) => (
                    <div key={row.staffName} className="ui-mobile-card">
                      <p className="font-semibold text-gray-900">{row.staffName}</p>
                      <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Income</p>
                          <p className="text-green-700 font-semibold mt-0.5">{formatMoney(row.income)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Utang</p>
                          <p className="text-amber-700 font-semibold mt-0.5">{formatMoney(row.utangTotal)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Sales</p>
                          <p className="mt-0.5">{row.transactions}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">Items</p>
                          <p className="mt-0.5">{row.itemsSold}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                />
              </section>
            )}

            {report.utangOrders?.length > 0 && (
              <section className="ui-card report-section shadow-sm border-amber-200 bg-gradient-to-br from-amber-50/60 to-white">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-amber-200/80">
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">Utang Sales</h2>
                  <ReportCountBadge count={report.utangOrders.length} variant="utang" />
                </div>
                <ReportScrollContainer
                  count={report.utangOrders.length}
                  variant="cards"
                  desktop={
                    <table className="w-full ui-table report-table min-w-[48rem]">
                      <thead>
                        <tr className="border-b border-gray-200 text-left">
                          <th>Date</th>
                          <th>Name</th>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th>Staff</th>
                          <th className="text-center">Pay</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.utangOrders.map((order) => (
                          <tr key={order.id} className="border-b border-gray-100 align-top">
                            <td className="whitespace-nowrap">
                              {new Date(order.order_date).toLocaleString()}
                            </td>
                            <td className="font-semibold text-amber-800">{order.debtor_name || '—'}</td>
                            <td>
                              {order.product_name}
                              {order.size ? <span className="text-gray-500"> · EU {order.size}</span> : null}
                            </td>
                            <td>{order.quantity}</td>
                            <td className="min-w-[9rem]">{renderUtangAmount(order)}</td>
                            <td>{renderUtangStatus(order)}</td>
                            <td>{order.staff_name || '—'}</td>
                            <td className="text-center">{renderPayUtangButton(order)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  }
                  mobile={report.utangOrders.map((order) => (
                    <div key={order.id} className="ui-mobile-card border-amber-100">
                      <div className="flex justify-between gap-2 mb-2">
                        <p className="font-semibold text-amber-800 truncate">{order.debtor_name || '—'}</p>
                        <div className="flex items-center gap-2 shrink-0">
                          {renderUtangStatus(order)}
                          {renderPayUtangButton(order)}
                        </div>
                      </div>
                      <div className="mb-2">{renderUtangAmount(order)}</div>
                      <p className="text-sm text-gray-900 font-medium">{order.product_name}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(order.order_date).toLocaleString()}</p>
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100 text-sm">
                        <div><span className="text-gray-500">Qty:</span> {order.quantity}</div>
                        <div><span className="text-gray-500">Staff:</span> {order.staff_name || '—'}</div>
                      </div>
                    </div>
                  ))}
                />
              </section>
            )}

            <section className="ui-card report-section shadow-sm border-gray-200 bg-gradient-to-br from-slate-50/50 to-white">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-gray-100">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">All Transactions</h2>
                {report.orders.length > 0 && (
                  <ReportCountBadge count={report.orders.length} variant="transactions" />
                )}
              </div>
              {report.orders.length === 0 ? (
                <p className="text-gray-500 text-sm py-6 text-center">No sales recorded for this period.</p>
              ) : (
                <ReportScrollContainer
                  count={report.orders.length}
                  variant="cards"
                  desktop={
                    <table className="w-full ui-table report-table min-w-[44rem]">
                      <thead>
                        <tr className="border-b border-gray-200 text-left">
                          <th>Date</th>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Amount</th>
                          <th>Discount</th>
                          <th>Staff</th>
                          <th>Payment</th>
                          <th>Utang Name</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.orders.map((order) => (
                          <tr key={order.id} className="border-b border-gray-100 align-top">
                            <td className="whitespace-nowrap">
                              {new Date(order.order_date).toLocaleString()}
                            </td>
                            <td>
                              {order.product_name}
                              {order.size ? <span className="text-gray-500"> · EU {order.size}</span> : null}
                            </td>
                            <td>{order.quantity}</td>
                            <td className={`font-semibold ${isUtangUnpaid(order) ? 'text-amber-700' : 'text-green-700'}`}>
                              {formatMoney(order.total_amount)}
                            </td>
                            <td className="text-amber-700">
                              {Number(order.discount) > 0 ? formatMoney(order.discount) : '—'}
                            </td>
                            <td>{order.staff_name || '—'}</td>
                            <td>
                              {isUtangPayment(order.payment_method) ? (
                                <span>
                                  {formatPaymentMethod(order.payment_method)}
                                  {isUtangPaid(order)
                                    ? ' (Paid)'
                                    : isUtangPartial(order)
                                      ? ` (Partial · ${formatMoney(getUtangRemaining(order))} left)`
                                      : ' (Pending)'}
                                </span>
                              ) : (
                                formatPaymentMethod(order.payment_method)
                              )}
                            </td>
                            <td className="font-medium text-amber-800">
                              {order.debtor_name || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  }
                  mobile={report.orders.map((order) => (
                    <div key={order.id} className="ui-mobile-card">
                      <div className="flex justify-between gap-2 mb-2">
                        <p className="font-semibold text-gray-900 break-words min-w-0">{order.product_name}</p>
                        <p className={`font-bold shrink-0 ${isUtangUnpaid(order) ? 'text-amber-700' : 'text-green-700'}`}>
                          {formatMoney(order.total_amount)}
                        </p>
                      </div>
                      <p className="text-xs text-gray-500">{new Date(order.order_date).toLocaleString()}</p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-3 pt-3 border-t border-gray-100 text-sm">
                        <div><span className="text-gray-500">Qty:</span> {order.quantity}</div>
                        <div><span className="text-gray-500">Size:</span> {order.size ? `EU ${order.size}` : '—'}</div>
                        <div><span className="text-gray-500">Staff:</span> {order.staff_name || '—'}</div>
                        <div className="col-span-2">
                          <span className="text-gray-500">Payment:</span>{' '}
                          {isUtangPayment(order.payment_method)
                            ? `${formatPaymentMethod(order.payment_method)}${isUtangPaid(order) ? ' (Paid)' : isUtangPartial(order) ? ` (Partial · ${formatMoney(getUtangRemaining(order))} left)` : ' (Pending)'}`
                            : formatPaymentMethod(order.payment_method)}
                        </div>
                        <div><span className="text-gray-500">Utang:</span> {order.debtor_name || '—'}</div>
                        <div><span className="text-gray-500">Discount:</span> {Number(order.discount) > 0 ? formatMoney(order.discount) : '—'}</div>
                      </div>
                    </div>
                  ))}
                />
              )}
            </section>
          </>
        )}
      </div>
    </Layout>
  )
}

export default Reports
