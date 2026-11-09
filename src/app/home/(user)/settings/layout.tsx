import type {Metadata} from 'next';
import {PageHead} from '@/components/portal/ui';
export const metadata:Metadata={title:'Settings'};
export default function SettingsLayout({children}:{children:React.ReactNode}){
 return <><PageHead title="Settings" note="Your profile, sign-in methods, and account security."/>{children}</>;
}
