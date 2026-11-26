interface NetlifyResponse {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
}

export async function handler(): Promise<NetlifyResponse> {
  const configured = Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
      process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
      process.env.GOOGLE_DRIVE_REFRESH_TOKEN
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      configured,
      hasPublicFolder: Boolean(process.env.GOOGLE_DRIVE_PUBLIC_FOLDER_ID),
      hasPrivateFolder: Boolean(process.env.GOOGLE_DRIVE_PRIVATE_FOLDER_ID),
      mode: configured ? 'live_google_drive' : 'unconfigured',
      message: configured
        ? 'Google Drive API aktif pada Netlify Functions.'
        : 'Kredensial Google Drive belum diatur pada environment variables Netlify.',
    }),
  };
}
