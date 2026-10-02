export interface OnAppStart {
  onAppStart(): void | Promise<void>;
}

export interface OnAppDestroy {
  onAppDestroy(): void | Promise<void>;
}
