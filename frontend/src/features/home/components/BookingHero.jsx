import Container from 'react-bootstrap/Container';
import BookingSearch from './BookingSearch';

export default function BookingHero() {
  return <section className="bs-ui booking-hero" aria-labelledby="home-heading">
    <div className="booking-hero-band"><Container>
      <h1 id="home-heading">Mỗi món quà, một hành trình</h1>
      <p>Khám phá quà Việt, những làng nghề và câu chuyện phía sau mỗi sản phẩm.</p>
    </Container></div>
    <Container className="booking-search-container"><BookingSearch /></Container>
  </section>;
}
