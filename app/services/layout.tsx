import type {Metadata} from 'next';

export const metadata:Metadata={
  title:'Treatments',
  description:'Emma’s full treatment menu with prices and durations: massage, facials and advanced skin, Lycon waxing, eyes and lashes, cryotherapy and holistic treatments.',
  alternates:{canonical:'/services'},
};

export default function Layout({children}:{children:React.ReactNode}){return children;}
