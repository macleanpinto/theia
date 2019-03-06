/********************************************************************************
 * Copyright (C) 2017 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import { Emitter, Event } from '@theia/core/lib/common';

export const NOTIFICATIONS_CONTAINER = 'theia-NotificationsContainer';
export const NOTIFICATION = 'theia-Notification';
export const ICON = 'icon';
export const TEXT = 'text';
export const BUTTONS = 'buttons';
export const PROGRESS = 'progress';

export interface NotificationAction {
    label: string;
    fn: (element: Notification) => void;
}

export interface NotificationProperties {
    id: string;
    icon: string;
    text: string;
    actions?: NotificationAction[];
    timeout: number | undefined;
    onTimeout: () => void;
}

export interface Notification {
    properties: NotificationProperties;
    element: Element;
}

export interface ProgressNotification {
    show(): void;
    close(): void;
    update(item: { message?: string, work?: { done: number, total: number } }): void;
}

export class Notifications {
    protected readonly onShowEmitter = new Emitter<string>();
    readonly onShow: Event<string> = this.onShowEmitter.event;

    protected container: Element;

    constructor(protected parent?: Element) {
        this.parent = parent || document.body;
        this.container = this.createNotificationsContainer(this.parent);
    }

    show(properties: NotificationProperties): void {
        const notificationElement = this.createNotificationElement(properties);
        this.container.appendChild(notificationElement);
        this.onShowEmitter.fire(properties.id);
    }

    create(properties: NotificationProperties): ProgressNotification {
        return new ProgressNotificationImpl(this.container, this.createNotificationElement(properties), properties, this.onShowEmitter);
    }

    dispose() {
        this.onShowEmitter.dispose();
    }

    protected createNotificationsContainer(parentContainer: Element): Element {
        const container = document.createElement('div');
        container.classList.add(NOTIFICATIONS_CONTAINER);
        return parentContainer.appendChild(container);
    }

    protected createNotificationElement(properties: NotificationProperties): Node {
        const fragment = document.createDocumentFragment();
        const element = fragment.appendChild(document.createElement('div'));
        element.classList.add(NOTIFICATION);
        element.id = 'notification-container-' + properties.id;
        const iconContainer = element.appendChild(document.createElement('div'));
        iconContainer.classList.add(ICON);
        const icon = iconContainer.appendChild(document.createElement('i'));
        icon.classList.add(
            'fa',
            this.toIconClass(properties.icon),
        );
        if (properties.icon === PROGRESS) {
            icon.classList.add('fa-pulse');
            const progressContainer = element.appendChild(document.createElement('div'));
            progressContainer.classList.add(PROGRESS);
            progressContainer.appendChild(document.createElement('p')).id = 'notification-progress-' + properties.id;
        }
        icon.classList.add(
            'fa-fw',
            properties.icon
        );
        const textContainer = element.appendChild(document.createElement('div'));
        textContainer.classList.add(TEXT);
        const text = textContainer.appendChild(document.createElement('p'));
        text.id = 'notification-text-' + properties.id;
        text.innerText = properties.text;
        const handler = <Notification>{ element, properties };
        const close = () => {
            element.remove();
        };
        const buttons = element.appendChild(document.createElement('div'));
        buttons.classList.add(BUTTONS);

        let closeTimer: number | undefined;
        if (properties.timeout && properties.timeout > 0) {
            this.onShow(id => {
                if (properties.id !== id) {
                    return;
                }
                if (closeTimer) {
                    window.clearTimeout(closeTimer);
                }
                closeTimer = window.setTimeout(() => {
                    properties.onTimeout();
                    close();
                }, properties.timeout);
            });
        }

        if (!!properties.actions) {
            for (const action of properties.actions) {
                const button = buttons.appendChild(document.createElement('button'));
                button.innerText = action.label;
                button.addEventListener('click', () => {
                    if (closeTimer) {
                        window.clearTimeout(closeTimer);
                    }
                    action.fn(handler);
                    close();
                });
            }
        }
        return fragment;
    }

    protected toIconClass(icon: string): string {
        switch (icon) {
            case 'error': return 'fa-times-circle';
            case 'warning': return 'fa-warning';
            case 'progress': return 'fa-spinner';
            default: return 'fa-info-circle';
        }
    }

}

class ProgressNotificationImpl implements ProgressNotification {
    private readonly node: Node;
    private readonly container: Element;
    private readonly properties: NotificationProperties;
    private readonly onShowEmitter: Emitter<string>;

    constructor(container: Element, node: Node, properties: NotificationProperties, onShowEmitter: Emitter<string>) {
        this.node = node;
        this.container = container;
        this.properties = properties;
        this.onShowEmitter = onShowEmitter;
    }

    close(): void {
        const element = document.getElementById('notification-container-' + this.properties.id);
        if (!element) {
            return;
        }
        element.remove();
    }

    show(): void {
        if (!document.getElementById(`notification-container-${this.properties.id}`)) {
            this.container.appendChild(this.node);
            this.onShowEmitter.fire(this.properties.id);
        }
    }

    update(item: { message?: string, work?: { done: number, total: number } }): void {
        const textElement = document.getElementById('notification-text-' + this.properties.id);
        if (textElement) {
            if (item.work) {
                const progressElement = document.getElementById('notification-progress-' + this.properties.id);
                if (progressElement) {
                    const progressRate = item.work;
                    progressElement.innerText = `${Math.floor(progressRate.done / progressRate.total * 100)}%`;
                }
            }
            textElement.innerText = this.properties.text + (item.message ? ': ' + item.message : '');
        }
    }
}
