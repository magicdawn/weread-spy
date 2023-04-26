import { Command } from 'clipanion'

export class InfoCommand extends Command {
  execute(): Promise<number | void> {
    throw new Error('Method not implemented.')
  }
}
