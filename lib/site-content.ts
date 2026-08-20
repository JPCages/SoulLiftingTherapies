import { categories, type Category } from './sandbox-data';

export type SiteContent={businessName:string;descriptor:string;heroTitle:string;heroAccent:string;heroIntro:string;phone:string;email:string;horncastle:string;woodhall:string;notice:string;categories:Category[]};

export const defaultSiteContent:SiteContent={
  businessName:'Soul Lifting Therapies', descriptor:'Massage & Facial Specialist',
  heroTitle:'Beauty that feels like', heroAccent:'time for you.',
  heroIntro:'Emma creates calm, considered treatments in Horncastle and Woodhall Spa.',
  phone:'07539 867002', email:'soulliftingtherapies@gmail.com',
  horncastle:'Coco Hair & Beauty, 25 Bull Ring, Horncastle, LN9 5HU',
  woodhall:'Ashlex Hair & Beauty, Tattershall Road, Woodhall Spa, Lincolnshire, LN10 6QJ',
  notice:'', categories
};
