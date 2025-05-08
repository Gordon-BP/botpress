import { Sticker, Image } from 'whatsapp-api-js/messages'
import * as types from '../types'
import { channels } from '.botpress'

type BPImage = channels.channel.image.Image

type ImageMessageProps = {
  payload: BPImage
  logger: types.Logger
  [key: string]: any
}

export function generateOutgoingMessages({
  payload,
  logger
}: ImageMessageProps): Image | Sticker {
  const isWebp = payload.imageUrl.toLowerCase().endsWith('.webp');

  if (isWebp) {
    // If it is a .webp image, yield a sticker
    logger.forBot().info("Sending WhatsApp sticker message");
    return new Sticker(payload.imageUrl, false);
  } else {
    // Otherwise it is a normal image
    logger.forBot().info("Sending WhatsApp image message");
    return new Image(payload.imageUrl, false);
  }
}

