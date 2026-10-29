import { NavLink, Outlet } from 'react-router-dom';
import { Card, Col, Container, Nav, Row } from 'react-bootstrap';

export default function WorkspaceLayout({ title, items }) {
  return <Container className="bs-ui booking-workspace py-4"><Row className="g-4">
    <Col lg={3} as="aside"><Card className="booking-workspace-menu"><Card.Body><h2 className="h6 fw-bold">{title}</h2><Nav aria-label={title} className="booking-workspace-nav" variant="pills">{items.map(({ to, label, icon: Icon }) => <Nav.Link as={NavLink} key={to} to={to}><Icon size={17} aria-hidden="true" />{label}</Nav.Link>)}</Nav></Card.Body></Card></Col>
    <Col lg={9} as="main" className="booking-workspace-content"><Outlet /></Col>
  </Row></Container>;
}
