/**
 * English dictionary — the source of truth for every translatable string.
 * `es.ts` is typed against these exact keys, and a unit test enforces parity,
 * so any key added or renamed here breaks the build until translations catch up.
 */
export const en = {
  // ---- shared ----
  'common.error': 'Something went wrong. Please try again in a moment.',
  'common.retry': 'Try again',
  'common.notFoundTitle': 'Invitation not found',
  'common.notFoundBody':
    "We couldn't find an invitation at this link. Double-check the link you received, or get in touch with us.",
  'common.days': 'days',
  'common.hours': 'hours',
  'common.minutes': 'minutes',
  'common.seconds': 'seconds',
  'common.weddingIsToday': 'Today is the day! 🎉',
  'common.openInMaps': 'Open in Google Maps',
  'common.yes': 'Yes',
  'common.no': 'No',

  // ---- landing page ----
  'landing.saveTheDate': 'Save the date',
  'landing.detailsTitle': 'The details',
  'landing.dateTitle': 'When',
  'landing.locationTitle': 'Where',
  'landing.dressCodeTitle': 'Dress code',
  'landing.dressCodeOutfit': "We can't wait to see you in your best outfit",
  'landing.rsvpBy': 'Please reply by',
  'landing.addToCalendar': 'Add to calendar',
  'landing.giftsTitle': 'Wedding gifts',
  'landing.giftsBody': 'If you would like to give us a gift, take a look at our list',
  'landing.giftsLink': 'Visit the gift registry',
  'landing.photosTitle': 'The couple',
  'landing.carouselPrev': 'Previous photo',
  'landing.carouselNext': 'Next photo',

  // ---- calendar ----
  'calendar.summary': '{groom} & {bride} — Wedding',

  // ---- personalized invite / RSVP ----
  'invite.hello': 'Welcome, {name}!',
  'invite.helloPlusOne': 'Welcome, {name} and {plusOne}!',
  'invite.subtitle': 'We joyfully invite you to celebrate our wedding',
  'invite.rsvpTitle': 'Will you join us?',
  'invite.alreadyResponded': 'You have already sent your response.',
  'invite.responseTitle': 'Your response',
  'invite.responseComing': "You're joining us — we can't wait! 🎉",
  'invite.responseNotComing': "You let us know you can't make it — you'll be missed!",
  'invite.responseChangeNote': 'If anything has changed, please contact the bride and groom directly.',
  'invite.contactWhatsApp': 'WhatsApp',
  'invite.attendingYes': "I'd love to — I'll be there",
  'invite.attendingNo': "Sadly, I won't be able to make it",
  'invite.plusOneName': 'Your +1 name',
  'invite.plusOneNameRequired': "Please enter your +1's name",
  'invite.plusOneJoining': 'Will your +1 be joining you?',
  'invite.dietaryGuest': 'Dietary restrictions (yours)',
  'invite.dietaryGuestSolo': 'Dietary restrictions',
  'invite.dietaryPlusOne': 'Dietary restrictions (+1)',
  'invite.song': 'A song you would love to dance to',
  'invite.songHint': 'We will do our best to play it!',
  'invite.comments': 'A message for the couple',
  'invite.submit': 'Send RSVP',
  'invite.sending': 'Sending…',
  'invite.thanks': 'Thank you! Your response has been saved.',
  'invite.thanksComing': "We can't wait to celebrate with you!",
  'invite.thanksMissing': 'We will miss you! Thanks for letting us know.',
  'invite.required': 'Please select an answer',
} as const;

export type MessageKey = keyof typeof en;
