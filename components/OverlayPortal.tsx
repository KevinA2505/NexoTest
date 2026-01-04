import React, { useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';

interface OverlayPortalProps {
  children: React.ReactNode;
  containerId?: string;
}

const OverlayPortal: React.FC<OverlayPortalProps> = ({ children, containerId = 'modal-root' }) => {
  const portalNode = useMemo(() => document.createElement('div'), []);

  useEffect(() => {
    const target = document.getElementById(containerId) ?? (() => {
      const node = document.createElement('div');
      node.id = containerId;
      document.body.appendChild(node);
      return node;
    })();

    portalNode.classList.add('overlay-portal-node');
    target.appendChild(portalNode);

    return () => {
      if (portalNode.parentElement === target) {
        target.removeChild(portalNode);
      }
    };
  }, [containerId, portalNode]);

  return ReactDOM.createPortal(children, portalNode);
};

export default OverlayPortal;
