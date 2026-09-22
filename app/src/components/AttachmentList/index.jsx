import React from "react"
import { Button, Card } from "@mantine/core"
import { Dropzone } from "@mantine/dropzone"
import { useSelector } from "react-redux"
import { cn, labelClass } from "app/core"
import { selectAttachments } from "app/core/attachments"
import { useLoader } from "app/core/loaders"
import { useTranslation } from "react-i18next"
import { uploadFiles } from "./actions"
import _ from "lodash"


const AttachmentList = ({ parentType, parentId, onUpload, label = "attachments", compact }) => {
  const { t } = useTranslation()
  const allAttachments = useSelector(() => selectAttachments())
  const attachments = _.orderBy(_.filter(allAttachments, { parentType, parentId }), ["createdAt"], ["desc"])
  const hasAttachments = !_.isEmpty(attachments)
  const isCompact = Boolean(compact)
  const uploading = useLoader("attachments.create")

  if (isCompact) {
    if (!hasAttachments) return null
    return (
      <div className={cn("attachment-list", "flex flex-wrap items-center gap-1")}>
        {_.map(attachments, (item) => {
          const { id, name, url } = item || {}
          return (
            <a
              key={id}
              className={cn(
                "attachment-chip",
                "max-w-full truncate rounded border border-cs-border px-1.5 py-0.5 text-[0.75rem] leading-normal text-cs-muted no-underline",
                "hover:border-cs-border-hover hover:text-cs-accent"
              )}
              href={url}
              target="_blank"
              rel="noreferrer"
            >
              {name}
            </a>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn("attachment-list")}>
      <div className={cn("attachment-list-header", "mb-3 flex items-end justify-between gap-3")}>
        <div className={cn("attachment-list-label", labelClass)}>{t(label)}</div>
        <Button className={cn("attachment-list-upload")} type="button" variant="outline" color="gray" onClick={onUpload}>
          {t("attach")}
        </Button>
      </div>
      {hasAttachments &&
        <div className={cn("attachment-list-items", "flex flex-col gap-3")}>
          {_.map(attachments, (item) => {
            const { id, name, url } = item || {}
            return (
              <Card
                key={id}
                className={cn("attachment-card", "hover:border-cs-border-hover")}
                component="a"
                href={url}
                target="_blank"
                rel="noreferrer"
              >
                <div className={cn("attachment-card-label", "text-[0.75rem] text-cs-muted")}>{t("file")}</div>
                <div className={cn("attachment-card-name", "mt-1 text-[0.875rem] leading-relaxed break-words text-cs-text")}>{name}</div>
              </Card>
            )
          })}
        </div>
      }
      {!hasAttachments &&
        <Dropzone
          className={cn("attachment-list-dropzone", "flex min-h-[8rem] items-center justify-center")}
          onDrop={(files) => uploadFiles({ parentType, parentId, files })}
          disabled={uploading}
        >
          <p className={cn("attachment-list-dropzone-copy", "m-0 text-center text-[0.75rem] leading-relaxed text-cs-muted")}>
            {uploading ? t("please_wait") : t("drop_files")}
          </p>
        </Dropzone>
      }
    </div>
  )
}

export default React.memo(AttachmentList)
