import BsGrid from '../../home/components/ResponsiveGrid';
import { Link } from 'react-router-dom';
import { formatVnd } from '../../../utils/format';
import Skeleton from '../../../components/ui/Skeleton';

const fields = [
  ['gross', 'Doanh thu đã đối soát'], ['unpostedGross', 'Tiền hàng chưa ghi sổ'],
  ['net', 'Tiền ròng trong sổ'], ['commission', 'Hoa hồng theo sổ'],
  ['available', 'Khả dụng để lập kỳ'], ['heldAmount', 'Đang giữ'],
  ['reserved', 'Kỳ đang chờ chi trả'], ['paidAmount', 'Đã chi trả'],
];
export default function RevenueSummary({ revenue, loading, settlementPath }) {
  return <section className="revenue-summary-detail-1" aria-label="Số liệu doanh thu và quyết toán">
    <p className="booking-small text-secondary revenue-summary-detail-2">Doanh thu đã đối soát là tiền hàng đã giao, đủ chứng từ thu tiền, sau hoàn tiền. Hoa hồng và tiền ròng lấy từ sổ quyết toán theo tỷ lệ đã ghi nhận của từng đơn. Khoản chưa ghi sổ chưa được tính vào số dư khả dụng.</p>
    <BsGrid as="div" columns={{"xs":1,"sm":2,"xl":4}} className="">{fields.map(([key, label]) => <div key={key} className="rounded-3 border border-secondary p-4 shadow-sm revenue-summary-detail-3">
      <p className="booking-small text-secondary">{label}</p>
      {loading ? <Skeleton className="mt-2 revenue-summary-detail-4" /> : <p className="mt-2 text-break fs-4 fw-bold text-secondary">{formatVnd(revenue?.[key] ?? 0)}</p>}
    </div>)}</BsGrid>
    {!loading && <dl className="d-grid gap-3 rounded-3 border border-secondary p-4 booking-small revenue-summary-detail-5">
      {[
        ['postedGross', 'Tiền hàng trong sổ sau hoàn'], ['refunds', 'Hoàn tiền hàng đã ghi sổ'],
        ['carrierFee', 'Phí COD bổ sung'], ['adjustments', 'Điều chỉnh số dư'],
        ['outstanding', 'Số dư chưa chi trả'], ['carryDebt', 'Nợ chuyển kỳ'], ['pipelineGross', 'Giá trị đơn đang xử lý'],
      ].map(([key, label]) => <div key={key}><dt className="text-secondary">{label}</dt><dd className="mt-1 fw-semibold">{formatVnd(revenue?.[key] ?? 0)}</dd></div>)}
    </dl>}
    <Link className="d-inline-flex align-items-center booking-small fw-semibold text-primary text-decoration-underline revenue-summary-detail-6" to={settlementPath}>Xem sổ quyết toán và chứng từ</Link>
  </section>;
}
