"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function SwaggerUIWrapper({ url }) {
  return (
    <SwaggerUI
      url={url}
      docExpansion="list"
      defaultModelsExpandDepth={1}
      persistAuthorization={true}
      tryItOutEnabled={false}
      filter={true}
    />
  );
}
