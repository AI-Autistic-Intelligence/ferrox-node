module.exports = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: ['intro', 'quickstart', 'dummy-app-guide'],
    },
    {
      type: 'category',
      label: 'Architectures',
      items: [
        'architectures/onion',
      ],
    },
    {
      type: 'category',
      label: 'Fundamentals',
      items: [
        'fundamentals/cqrs',
      ],
    },
    {
      type: 'category',
      label: 'Security & Auth',
      items: [
        'security/paseto',
      ],
    },
    {
      type: 'category',
      label: 'Framework Components',
      items: [
        'components/auth',
        'components/config',
        'components/core',
        'components/cqrs',
        'components/datagrid',
        'components/guards',
        'components/i18n',
        'components/interfaces',
        'components/jobs',
        'components/kernel',
        'components/resilience',
        'components/routing',
        'components/security',
        'components/selftest',
        'components/storage',
        'components/tracing',
        'components/transports',
      ],
    },
  ],
};
