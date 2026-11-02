import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import ImageSelector, { type ImageSelection } from './components/ImageSelector'
import styles from './index.module.css'

interface Screenshot {
  selectionId: string
  imageUrl: string
}

function ImageCropDemo() {
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [selections, setSelections] = useState<ImageSelection[]>([])
  const [screenshots, setScreenshots] = useState<Screenshot[]>([])
  const [selectedSelectionId, setSelectedSelectionId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const originalUrlRef = useRef<string | null>(null)
  const screenshotUrlsRef = useRef(new Set<string>())
  const selectionIdsRef = useRef(new Set<string>())
  const imageGenerationRef = useRef(0)
  const cleanupTimerRef = useRef<number | null>(null)

  const releaseScreenshots = () => {
    screenshotUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    screenshotUrlsRef.current.clear()
  }

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!supportedTypes.includes(file.type)) {
      setErrorMessage('请选择 JPG、PNG 或 WebP 图片。')
      return
    }

    const nextUrl = URL.createObjectURL(file)
    imageGenerationRef.current += 1
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current)
    originalUrlRef.current = nextUrl
    releaseScreenshots()
    selectionIdsRef.current.clear()
    setOriginalImage(nextUrl)
    setSelections([])
    setScreenshots([])
    setSelectedSelectionId(null)
    setErrorMessage(null)
  }

  const createScreenshot = async (selection: ImageSelection, generation: number) => {
    const source = new Image()
    source.src = selection.imageUrl

    try {
      await source.decode()
      if (generation !== imageGenerationRef.current || !selectionIdsRef.current.has(selection.id)) return

      const x = Math.max(0, Math.min(Math.floor(selection.x), source.naturalWidth))
      const y = Math.max(0, Math.min(Math.floor(selection.y), source.naturalHeight))
      const width = Math.min(Math.ceil(selection.width), source.naturalWidth - x)
      const height = Math.min(Math.ceil(selection.height), source.naturalHeight - y)
      if (width <= 0 || height <= 0) return

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) {
        setErrorMessage('浏览器无法创建 Canvas 画布，请尝试其他浏览器。')
        return
      }

      context.drawImage(source, x, y, width, height, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (!blob) {
          setErrorMessage('截图生成失败，请重新框选。')
          return
        }

        const screenshotUrl = URL.createObjectURL(blob)
        if (generation !== imageGenerationRef.current || !selectionIdsRef.current.has(selection.id)) {
          URL.revokeObjectURL(screenshotUrl)
          return
        }

        screenshotUrlsRef.current.add(screenshotUrl)
        setScreenshots((current) => [...current, { selectionId: selection.id, imageUrl: screenshotUrl }])
      }, 'image/png')
    } catch {
      if (generation === imageGenerationRef.current && selectionIdsRef.current.has(selection.id)) {
        setErrorMessage('图片读取失败，请重新上传。')
      }
    }
  }

  const handleSelectionAdd = (selection: ImageSelection) => {
    const generation = imageGenerationRef.current
    selectionIdsRef.current.add(selection.id)
    setSelections((current) => [...current, selection])
    setSelectedSelectionId(selection.id)
    void createScreenshot(selection, generation)
  }

  const handleScreenshotDelete = (selectionId: string) => {
    selectionIdsRef.current.delete(selectionId)
    setSelections((current) => current.filter((selection) => selection.id !== selectionId))
    setScreenshots((current) => {
      const removed = current.filter((screenshot) => screenshot.selectionId === selectionId)
      removed.forEach(({ imageUrl }) => {
        URL.revokeObjectURL(imageUrl)
        screenshotUrlsRef.current.delete(imageUrl)
      })
      return current.filter((screenshot) => screenshot.selectionId !== selectionId)
    })
    setSelectedSelectionId((current) => current === selectionId ? null : current)
  }

  const handleClearAll = () => {
    selectionIdsRef.current.clear()
    releaseScreenshots()
    setSelections([])
    setScreenshots([])
    setSelectedSelectionId(null)
  }

  useEffect(() => {
    if (cleanupTimerRef.current !== null) {
      window.clearTimeout(cleanupTimerRef.current)
      cleanupTimerRef.current = null
    }

    return () => {
      cleanupTimerRef.current = window.setTimeout(() => {
        imageGenerationRef.current += 1
        if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current)
        originalUrlRef.current = null
        releaseScreenshots()
        cleanupTimerRef.current = null
      }, 0)
    }
  }, [])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>CANVAS TOOL</p>
          <h1>图片框选截图</h1>
          <p className={styles.subtitle}>在原图上拖动框选区域，截图会按原始像素生成。</p>
        </div>
        <Link className={styles.backLink} to="/">返回 Three.js 场景 <span aria-hidden="true">↗</span></Link>
      </header>

      <main className={styles.workspace}>
        <section className={styles.editorCard} aria-labelledby="editor-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.stepLabel}>01 / SOURCE</p>
              <h2 id="editor-title">原始图片</h2>
            </div>
            <label className={styles.uploadButton}>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} />
              {originalImage ? '更换图片' : '上传图片'}
            </label>
          </div>

          {errorMessage && <p className={styles.errorMessage} role="alert">{errorMessage}</p>}

          {originalImage ? (
            <div className={styles.imageFrame}>
              <ImageSelector
                imageUrl={originalImage}
                selections={selections}
                selectedSelectionId={selectedSelectionId}
                onSelectionAdd={handleSelectionAdd}
              />
            </div>
          ) : (
            <label className={styles.emptyUpload}>
              <span className={styles.uploadGlyph} aria-hidden="true">＋</span>
              <strong>选择一张图片开始框选</strong>
              <span>支持 JPG、PNG、WebP</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} />
            </label>
          )}

          <div className={styles.editorFooter}>
            <span><i className={styles.legendBlue} /> 已保存区域</span>
            <span><i className={styles.legendAmber} /> 当前选中</span>
            <span className={styles.selectionCount}>{selections.length} 个区域</span>
          </div>
        </section>

        <aside className={styles.sidebar} aria-labelledby="screenshots-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.stepLabel}>02 / CLIPS</p>
              <h2 id="screenshots-title">截图列表 <span className={styles.countBadge}>{screenshots.length}</span></h2>
            </div>
            {screenshots.length > 0 && (
              <button className={styles.clearButton} type="button" onClick={handleClearAll}>清空</button>
            )}
          </div>

          {screenshots.length ? (
            <div className={styles.screenshotList}>
              {screenshots.map((screenshot, index) => {
                const selection = selections.find(({ id }) => id === screenshot.selectionId)
                return (
                  <article
                    key={screenshot.selectionId}
                    className={`${styles.screenshotCard} ${selectedSelectionId === screenshot.selectionId ? styles.activeCard : ''}`}
                  >
                    <button
                      className={styles.screenshotPreview}
                      type="button"
                      onClick={() => setSelectedSelectionId(screenshot.selectionId)}
                      aria-label={`高亮第 ${index + 1} 个框选区域`}
                    >
                      <img src={screenshot.imageUrl} alt={`截图 ${index + 1}`} />
                    </button>
                    <div className={styles.screenshotMeta}>
                      <div>
                        <strong>区域 {String(index + 1).padStart(2, '0')}</strong>
                        <span>{selection ? `${selection.width} × ${selection.height} px` : '截图'}</span>
                      </div>
                      <button
                        className={styles.deleteButton}
                        type="button"
                        onClick={() => handleScreenshotDelete(screenshot.selectionId)}
                        aria-label={`删除第 ${index + 1} 张截图`}
                      >
                        删除
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className={styles.emptyList}>
              <span className={styles.emptyListIcon} aria-hidden="true">▧</span>
              <strong>还没有截图</strong>
              <span>在左侧图片上拖动鼠标框选区域</span>
            </div>
          )}
          <p className={styles.sidebarNote}>截图以原图像素尺寸生成，不包含框选边框。</p>
        </aside>
      </main>
    </div>
  )
}

export default ImageCropDemo
