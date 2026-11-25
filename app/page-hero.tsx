// The full-screen photo banner used at the top of the inner pages, matching
// the homepage: photo, soft shade, gold label and a large headline bottom-left.
// The photo is Emma's to change from the portal; with none set the banner
// falls back to a plain teal panel rather than a stock picture.
export default function PageHero({image,label,title,intro,alt}:{image?:string;label?:string;title:string;intro?:string;alt:string}){
  return <section className="lux-hero lux-hero-page">
    {image&&<img className="lux-hero-img" src={image} alt={alt}/>}
    <div className="lux-hero-shade" aria-hidden="true"/>
    <div className="lux-hero-body">
      {label&&<p className="lux-label lux-label-light">{label}</p>}
      <h1 className="lux-hero-title">{title}</h1>
      {intro&&<p className="lux-hero-lede">{intro}</p>}
    </div>
  </section>;
}
