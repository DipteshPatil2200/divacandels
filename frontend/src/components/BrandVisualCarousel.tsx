import Carousel from "react-bootstrap/Carousel";

const visuals = [
  ["/diva-hero-01.webp", "A refined collection of handcrafted candles"],
  ["/diva-hero-02.webp", "An artisan hand-pouring a candle"],
  ["/diva-hero-03.webp", "Candles arranged for a premium celebration"],
  ["/diva-hero-04.webp", "Sculptural candles in a sunlit Indian home"],
  ["/diva-hero-05.webp", "Festive handcrafted candle arrangement"],
  ["/diva-hero-06.webp", "Ceramic candles in a calming spa setting"],
  ["/diva-hero-07.webp", "Elegant candlelit dinner setting"],
  ["/diva-hero-08.webp", "A warm bedside candle at dusk"],
  ["/diva-hero-09.webp", "Sculptural candles in an artisan studio"],
  ["/diva-hero-10.webp", "Premium candle gifting collection"],
];

export function BrandVisualCarousel() {
  return <Carousel className="brand-visual-carousel" fade interval={20000} pause="hover" indicators={false} controls={false} touch>
    {visuals.map(([src, alt], index) => <Carousel.Item key={src}>
      <img className="d-block w-100" src={src} alt={alt} loading={index === 0 ? "eager" : "lazy"}/>
    </Carousel.Item>)}
  </Carousel>;
}
