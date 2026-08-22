interface DirectoryPickerOptions {
  mode?: 'read' | 'readwrite'
  startIn?: 'documents' | 'desktop' | 'downloads' | 'music' | 'pictures' | 'videos'
}

interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite'
}

interface FileSystemDirectoryHandle {
  requestPermission?: (
    descriptor?: FileSystemHandlePermissionDescriptor,
  ) => Promise<PermissionState>
  queryPermission?: (
    descriptor?: FileSystemHandlePermissionDescriptor,
  ) => Promise<PermissionState>
}

interface Window {
  showDirectoryPicker?: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>
}

interface Navigator {
  brave?: {
    isBrave?: () => Promise<boolean>
  }
}
