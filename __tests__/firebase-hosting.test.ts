import fs from 'fs';
import path from 'path';

const businessAppUrl = 'https://stallpass-business-web--stallpass.us-central1.hosted.app';

describe('Firebase static hosting contract', () => {
  it('redirects legacy business dashboard routes to the Next.js business app', () => {
    const firebaseConfig = JSON.parse(
      fs.readFileSync(path.join(process.cwd(), 'firebase.json'), 'utf8')
    ) as {
      hosting?: {
        redirects?: Array<{ source: string; destination: string; type: number }>;
      };
    };

    const redirects = firebaseConfig.hosting?.redirects ?? [];
    expect(redirects).toEqual(
      expect.arrayContaining([
        {
          source: '/business',
          destination: businessAppUrl,
          type: 302,
        },
        {
          source: '/business/**',
          destination: businessAppUrl,
          type: 302,
        },
        {
          source: '/dashboard',
          destination: businessAppUrl,
          type: 302,
        },
        {
          source: '/dashboard/**',
          destination: businessAppUrl,
          type: 302,
        },
      ])
    );
  });

  it('does not serve the legacy Babel prototype from the business landing page', () => {
    const businessLanding = fs.readFileSync(
      path.join(process.cwd(), 'web/business/index.html'),
      'utf8'
    );

    expect(businessLanding).toContain(businessAppUrl);
    expect(businessLanding).not.toContain('@babel/standalone');
    expect(businessLanding).not.toContain('/dashboard/data.jsx');
  });
});
