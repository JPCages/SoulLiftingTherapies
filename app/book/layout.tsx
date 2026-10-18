import type {Metadata} from 'next';

export const metadata:Metadata={
  title:'Request an appointment',
  description:'Tell Emma which treatment you would like and when suits you. She checks her diary and comes back to confirm.',
  alternates:{canonical:'/book'},
};

export default function Layout({children}:{children:React.ReactNode}){return children;}
