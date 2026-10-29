import { Children } from 'react';
import { Col, Row } from 'react-bootstrap';

// Equal-column content grids. Unequal editorial layouts use their own CSS grid.
export default function ResponsiveGrid({ children, columns = { xs: 1 }, as = 'div', className = '', ...props }) {
  return <Row as={as} className={`g-3 ${className}`} {...props}>{Children.toArray(children).map((child, index) => {
    const sizing = {};
    for (const [breakpoint, count] of Object.entries(columns)) {
      const prefix = `layout-span-${breakpoint}-`;
      const span = String(child?.props?.className || '').split(/\s+/).find(token => token.startsWith(prefix));
      const requested = span?.slice(prefix.length);
      sizing[breakpoint] = requested === 'full' ? 12 : Math.min(12, (12 / count) * (Number(requested) || 1));
    }
    return <Col key={child?.key ?? index} {...sizing}>{child}</Col>;
  })}</Row>;
}
