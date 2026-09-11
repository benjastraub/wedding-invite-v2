import type { MessageKey } from './en';

/**
 * Spanish dictionary.
 * Typed as `Record<MessageKey, string>` so a missing or extra key is a
 * compile-time error — translations can never drift from the English source.
 */
export const es: Record<MessageKey, string> = {
  // ---- shared ----
  'common.error': 'Algo salió mal. Inténtalo de nuevo en un momento.',
  'common.retry': 'Intentar de nuevo',
  'common.notFoundTitle': 'Invitación no encontrada',
  'common.notFoundBody':
    'No encontramos una invitación en este enlace. Revisa el enlace que recibiste o ponte en contacto con nosotros.',
  'common.days': 'días',
  'common.hours': 'horas',
  'common.minutes': 'minutos',
  'common.seconds': 'segundos',
  'common.weddingIsToday': '¡Hoy es el gran día! 🎉',
  'common.openInMaps': 'Abrir en Google Maps',
  'common.yes': 'Sí',
  'common.no': 'No',

  // ---- after the wedding ----
  'postWedding.title': 'Gracias por celebrar con nosotros',
  'postWedding.body':
    'Nuestra boda ya pasó y fue aún más especial gracias a ti.',

  // ---- landing page ----
  'landing.saveTheDate': 'Reserva la fecha',
  'landing.detailsTitle': 'Los detalles',
  'landing.dateTitle': 'Cuándo',
  'landing.locationTitle': 'Dónde',
  'landing.dressCodeTitle': 'Código de vestimenta',
  'landing.dressCodeOutfit': 'Te esperamos con tu mejor outfit',
  'landing.rsvpBy': 'Por favor confirma antes del',
  'landing.addToCalendar': 'Añadir al calendario',
  'landing.giftsTitle': 'Código de novios',
  'landing.giftsBody': 'Si deseas hacernos un regalo, revisa nuestra lista',
  'landing.giftsLink': 'Ver la lista de regalos',
  'landing.photosTitle': 'Los novios',
  'landing.carouselPrev': 'Foto anterior',
  'landing.carouselNext': 'Foto siguiente',

  // ---- calendar ----
  'calendar.summary': '{groom} y {bride} — Matrimonio',

  // ---- personalized invite / RSVP ----
  'invite.hello': '¡Hola, {name}!',
  'invite.helloPlusOne': '¡Hola, {name} y {plusOne}!',
  'invite.subtitle': 'Con alegría te invitamos a celebrar nuestra boda',
  'invite.rsvpTitle': '¿Nos acompañas?',
  'invite.alreadyResponded': 'Ya enviaste tu respuesta.',
  'invite.responseTitle': 'Tu respuesta',
  'invite.responseComing': '¡Nos acompañarás, no podemos esperar! 🎉',
  'invite.responseNotComing': 'Nos avisaste que no podrás asistir: ¡te extrañaremos!',
  'invite.responseChangeNote': 'Si algo cambió, por favor contacta directamente a los novios.',
  'invite.contactWhatsApp': 'WhatsApp',
  'invite.attendingYes': '¡Sí! Ahí estaré',
  'invite.attendingNo': 'Lamentablemente no podré asistir',
  'invite.plusOneName': 'Nombre de tu acompañante (+1)',
  'invite.plusOneNameRequired': 'Por favor escribe el nombre de tu acompañante',
  'invite.plusOneJoining': '¿Vendrá tu acompañante?',
  'invite.dietaryGuest': 'Restricciones alimentarias (tuyas)',
  'invite.dietaryGuestSolo': 'Restricciones alimentarias',
  'invite.dietaryPlusOne': 'Restricciones alimentarias (+1)',
  'invite.song': 'Una canción que te encantaría bailar',
  'invite.songHint': '¡Haremos lo posible por ponerla!',
  'invite.comments': 'Un mensaje para los novios',
  'invite.submit': 'Enviar RSVP',
  'invite.sending': 'Enviando…',
  'invite.thanks': '¡Gracias! Tu respuesta ha sido guardada.',
  'invite.thanksComing': '¡No podemos esperar a celebrar contigo!',
  'invite.thanksMissing': '¡Te extrañaremos! Gracias por avisarnos.',
  'invite.required': 'Por favor elige una respuesta',
  'invite.rsvpClosedTitle': 'El plazo para confirmar ha terminado',
  'invite.rsvpClosedBody':
    'Ya no aceptamos respuestas en línea. Si aún necesitas decirnos algo, por favor contáctanos directamente.',
  'invite.rsvpClosedContact': 'Contáctanos',
};
