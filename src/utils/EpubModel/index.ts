import mime from 'mime'

export interface MetadataFields {
  bookId: string
  title: string

  /**
   * publish date
   */

  date: Date
  modified: Date

  /**
   * author
   */
  creator: string

  lang: string

  /**
   * cover assets id
   */
  cover: string
}

export interface FileItemFields {
  filename: string
  content?: string | Buffer
  filepath?: string // for content
  id?: string
  mimetype?: string
  properties?: string
}

export interface ModelInterface {
  generate(): string
}

class Model<T> {
  data: T
  toString() {
    return JSON.stringify(this.data, null, 2)
  }
  constructor(options: T) {
    this.data = { ...options }
  }
  set(options: T) {
    this.data = { ...this.data, ...options }
  }
}

export class Metadata extends Model<MetadataFields> {
  get val(): MetadataFields {
    return {
      ...this.data,
    }
  }
}

export class FileItem extends Model<FileItemFields> {
  get val(): FileItemFields {
    return {
      ...this.data,
      id: this.id,
      mimetype: this.mimetype,
    }
  }

  get filename() {
    return this.data.filename
  }

  get properties() {
    return this.data.properties
  }

  get content() {
    return this.data.content
  }

  get filepath() {
    return this.data.filepath
  }

  /**
   * with fallback
   */

  get mimetype() {
    return this.data.mimetype || mime.getType(this.data.filename)
  }

  get id() {
    return this.data.id || this.data.filename.replace(/[/]/g, '__')
  }
}
