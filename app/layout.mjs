import React from 'react';
import '@superintelligence/ui/styles.css';
import './global.css';
export const metadata={title:"Superintelligence Command Center",description:"Professional AI tools will activate only after their model and execution integrations are verified."};
export default function RootLayout({children}){return React.createElement('html',{lang:'en'},React.createElement('body',{'data-product':"command"},children));}
