import React from 'react';

// Icons (simple SVG examples)
export const BlockHeightIcon: React.FC = () => (
  React.createElement("svg", {
    className: "w-6 h-6 text-indigo-400",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg"
  }, React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: "2",
    d: "M4 7v10l2 2m0-2h4m-4 0L9 7m2 10V7m0 10h4m-4 0l3 3m0-3h4m0-3V7m0 10l3 3m0-3h4M4 7l3 3m0 0l3-3"
  }))
);

export const TransactionsIcon: React.FC = () => (
  React.createElement("svg", {
    className: "w-6 h-6 text-green-400",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg"
  }, React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: "2",
    d: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H8m0 0l4 4m-4-4l4-4"
  }))
);

export const GasPriceIcon: React.FC = () => (
  React.createElement("svg", {
    className: "w-6 h-6 text-yellow-400",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg"
  }, React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: "2",
    d: "M13 10V3L4 14h7v7l9-11h-7z"
  }))
);

export const NodesIcon: React.FC = () => (
  React.createElement("svg", {
    className: "w-6 h-6 text-red-400",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg"
  }, React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: "2",
    d: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 0a9 9 0 01-9-9m9 9a9 9 0 00-9 9m-4 2h16a2 2 0 002-2V7a2 2 0 00-2-2H3a2 2 0 00-2 2v10a2 2 0 002 2z"
  }))
);

export const MarketCapIcon: React.FC = () => (
  React.createElement("svg", {
    className: "w-6 h-6 text-blue-400",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    xmlns: "http://www.w3.org/2000/svg"
  }, React.createElement("path", {
    strokeLinecap: "round",
    strokeLinejoin: "round",
    strokeWidth: "2",
    d: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1L21 6H3l.698 2.333A11.972 11.972 0 0012 18h.001zm0 0c-.015 0-.029-.001-.044-.002l-1.644-3.5a1 1 0 01-.194-.23L4 9h16l-7.387 7.387a1 1 0 01-.194.23L12.044 8.002z"
  }))
);